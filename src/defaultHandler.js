import "core-js/stable";
import "regenerator-runtime/runtime";
import knex from 'knex';
const trim = (s, len) => s.length > len ? s.substring(0, len) : s;

// helper function for turning string *or* JSON into string
function handleJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return str;
    }
    return JSON.stringify(str);
}

class DefaultHandler {
	constructor(db_url, dbTablePrefix, transactionOps) {
		this.tables = {
			users: `${dbTablePrefix}_users`,
			stim: `${dbTablePrefix}_stimuli`,
			stimResp: `${dbTablePrefix}_stimulusResponses`,
			stimGroups: `${dbTablePrefix}_stimulusGroups`,
			stimGroupStim: `${dbTablePrefix}_stimulusGroupStimuli`,
			TUQ: `${dbTablePrefix}_TUQ`,
			TUQSR: `${dbTablePrefix}_TUQSR`,
		};
		this.pg_main = knex({ client: 'pg', connection: db_url, });

		this.logging = transactionOps ? true : false;
		if (this.logging) {
			this.trans_table = transactionOps.tableName;
			this.pg_trans = knex({ client: 'pg', connection: transactionOps.url });
			this.trans_mapper = transactionOps.mapper;
		}
	}

	async logTransaction(knexCommand) {
		if (!this.logging) return knexCommand;
		const toInsert = this.trans_mapper(knexCommand.toString());
		await this.pg_trans(this.trans_table).insert(toInsert);
		return knexCommand;
	}

	async startExperiment(sessId, data) {
		console.log(arguments);
		if (!sessId)
			throw new Error('startExperiment got invalid session id');
		if (!data.user_id)
			throw new Error('startExperiment got invalid userID');

		const userId = data.user_id;

		// check if the user already has a TUQ record (i.e. is already taking the quiz)
		const tuqCount = (await this.pg_main(this.tables.TUQ).where('user_id', userId).count('*'))[0].count;
		if (tuqCount > 0)
			throw new Error(`user ${userId} already has a TUQ record, aborting`);

		// good to go
		const maxStimuli = 4;
		console.log(`starting experiment for user ${userId} with ${maxStimuli} max stimuli`);

		// the stimuli selected can be adjusted here
		// create a stimulus group (stimGroups) (for this experiment, we'll just
		// make a new group for each quiz run)
		const stimGroupId = (await this.logTransaction(this.pg_main(this.tables.stimGroups)
			.insert({ created_at: new Date() }).returning('id')))[0];

		console.log(`assigned user ${userId} stimulus group ${stimGroupId}`);

		const selectedStims = await this.pg_main(this.tables.stim)
			.select('id').orderByRaw('random()').limit(maxStimuli);

		console.log(`selected ${selectedStims.length} stimuli for group ${stimGroupId}`);

		// add stimuli to the group (stimGroupStim)
		let position = 0;
		await this.logTransaction(this.pg_main(this.tables.stimGroupStim).insert(
			selectedStims.map(stim => ({
				group: stimGroupId,
				stimulus: stim.id,
				position: position++
			}))
		));

		console.log(`added ${selectedStims.length} stimuli to group ${stimGroupId}`);

		// initialize This User Quiz (TUQ)
		await this.logTransaction(this.pg_main(this.tables.TUQ).insert({
			user_id: userId,
			stim_group: stimGroupId,
			started_at: new Date(),
			cur_position: 0
		}));

		console.log(`created new TUQ record for user ${userId}`);
		console.log(`done starting experiment for user ${userId}`);

		return true;
	}

	async getStimuli(sessId, data) {
		// nItems = 0 implies get all stimuli
		if (!sessId)
			throw new Error('getStimuli got invalid session id');
		if (!data.user_id)
			throw new Error('getStimuli got invalid userID');

		const userId = data.user_id;
		const nItems = data.nItems;
		const selectedStims = (data.nItems ? 
			await this.pg_main(this.tables.stim).select('stimulus').orderByRaw('random()').limit(nItems) :
			await this.pg_main(this.tables.stim).select('stimulus').orderByRaw('random()')
			);
		console.log(selectedStims);

		return selectedStims;
	}

	async insertMetaResponse(sessId, data) {
		if (!sessId)
			throw new Error('insertMetaResponse got invalid session id');
		if (!data.type)
			throw new Error('insertMetaResponse got invalid response type');
		if (!data.response)
			throw new Error('insertMetaResponse got invalid response data');
		if (!data.user_id)
			throw new Error('insertMetaResponse got invalid userID');
		const userId = data.user_id;
		const type = data.type;
		const response = data.response;

		// these should match columns in the users table that contain meta info
		const validMetaColumns = [ 'dob', 'native_language' ];
		if (validMetaColumns.indexOf(type) <= -1)
			throw new Error(`insertMetaResponse: user ${userId} attempted to save meta to an invalid column "${type}"`);

		return this.pg_main(this.tables.users).where('id', userId).first(type)
			.then(maybeTypeData => {
				const e = maybeTypeData[type];
				console.log(`${e ? 'changing' : 'setting'} user ${userId}'s ${type} to "${trim(response, 30)}"`);
				return this.logTransaction(this.pg_main(this.tables.users).where('id', userId).update(type, response));
			}).then(() => 0);
	}

	async insertStimulusResponse(sessId, data) {
		if (!sessId)
			throw new Error('insertStimulusResponse got invalid session id');
		if (!data.data_string)
			throw new Error('insertStimulusResponse got invalid response data string');
		if (!data.user_id)
			throw new Error('insertStimulusResponse got invalid userID');
		if (!data.data_string.stimulus)
			throw new Error('insertStimulusResponse got invalid stimulus');

		console.log(`inserting response for user ${data.user_id}: ${trim(JSON.stringify(data.data_string), 100)}`);

		return this.logTransaction(this.pg_main(this.tables.stimResp).insert({
			user_id: data.user_id,
			stimulus: handleJSON(data.stimulus),
			response: JSON.stringify(data.data_string),
			created_at: new Date()
		}));
	}

	async endExperiment(sessId, data) {
		if (!sessId)
			throw new Error('endExperiment got invalid session id');
		if (!data.user_id)
			throw new Error('endExperiment got invalid userID');

		const userId = data.user_id;

		// make sure the user has a TUQ record
		const tuqCount = (await this.pg_main(this.tables.TUQ).where('user_id', userId).count('*'))[0].count;
		if (tuqCount == 0)
			throw new Error(`endExperiment: user ${userId} doesn't have a TUQ record, aborting`);

		console.log(`ending experiment for user ${userId}`);

		// get TUQSRs
		return this.pg_main(this.tables.TUQSR).where('user_id', userId).select('*')
			.then(responses => {
				console.log(`solidifying user ${userId}'s responses`);
				const res = responses.map(r => ({
					user_id: userId,
					stimulus: r.stimulus,
					response: JSON.stringify(r.response),
					created_at: r.answered_at,
					updated_at: r.modified_at
				}));
				// put TUQSRs in stimResp
				return this.logTransaction(this.pg_main(this.tables.stimResp).insert(res));
			}).then(() => {
				// delete TUQSRs
				console.log(`deleting user ${userId}'s temp responses`);
				return this.logTransaction(this.pg_main(this.tables.TUQSR).where('user_id', userId).del());
			}).then(() => {
				// delete TUQ record
				console.log(`removing user ${userId}'s TUQ record`);
				return this.logTransaction(this.pg_main(this.tables.TUQ).where('user_id', userId).del());
			}).then(() => 0);
	}

}

module.exports = {
	defaultHandler: DefaultHandler,
	defaultMethods: [
		'startExperiment',
		'getStimuli',
		'insertMetaResponse',
		'insertStimulusResponse',
		'endExperiment'
	]
};





