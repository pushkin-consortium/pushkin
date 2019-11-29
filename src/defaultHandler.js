import "core-js/stable";
import "regenerator-runtime/runtime";
import knex from 'knex';
const trim = (s, len) => s.length > len ? s.substring(0, len) : s;

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

	async startExperiment(sessId) {
		console.log(`sessId: ${sessId}`);
		console.log(arguments);
		if (!sessId)
			throw new Error('startExperiment got invalid session id');

		const userId = await this.getOrMakeUser(sessId);

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

	async getStimuli(sessId) {
		if (!sessId)
			throw new Error('getStimuli got invalid session id');

		const userId = await this.getOrMakeUser(sessId);
		return this.pg_main(this.tables.TUQ).where('user_id', userId).select('stim_group')
			.then(async g => {
				if (g.length < 1)
					throw new Error(`getStimuli: user ${userId} doesn't have a TUQ record, aborting`);

				const stimGroupId = g[0].stim_group;
				console.log(`getStimuli: getting user ${userId} stimuli from group ${stimGroupId}`);

				const stims = await this.pg_main(this.tables.stim).join(
					this.tables.stimGroupStim,
					`${this.tables.stim}.id`,
					`${this.tables.stimGroupStim}.stimulus`
				).where(`${this.tables.stimGroupStim}.group`, stimGroupId)
					.select(`${this.tables.stim}.stimulus`);

				return stims;
			});
	}

	async insertMetaResponse(sessId, data) {
		if (!sessId)
			throw new Error('insertMetaResponse got invalid session id');
		if (!data.type)
			throw new Error('insertMetaResponse got invalid response type');
		if (!data.response)
			throw new Error('insertMetaResponse got invalid response data');
		const type = data.type;
		const response = data.response;

		// these should match columns in the users table that contain meta info
		const validMetaColumns = [ 'dob', 'native_language' ];
		if (validMetaColumns.indexOf(type) <= -1)
			throw new Error(`insertMetaResponse: user ${userId} attempted to save meta to an invalid column "${type}"`);

		const userId = await this.getOrMakeUser(sessId);

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
		const response = data.data_string;

		const userId = await this.getOrMakeUser(sessId);
		console.log(`inserting response for user ${userId}: ${trim(JSON.stringify(response), 100)}`);

		// DO CHECKS (not past end of experiment, etc.)

		return this.pg_main(this.tables.TUQ).where('user_id', userId).first('stim_group', 'cur_position')
			.then(t => {
				return this.pg_main(this.tables.stimGroupStim)
					.where({
						group: t.stim_group,
						position: t.cur_position
					}).first('stimulus');
			}).then(stimRes => {
				return this.logTransaction(this.pg_main(this.tables.TUQSR).insert({
					user_id: userId,
					stimulus: stimRes.stimulus,
					response: JSON.stringify(response),
					answered_at: new Date()
				}));
			}).then(() => {
				console.log(`incrementing user ${userId}'s cur_position`);
				return this.logTransaction(this.pg_main(this.tables.TUQ).where('user_id', userId).increment('cur_position'));
			}).then(() => 0);
	}

	async endExperiment(sessId) {
		if (!sessId)
			throw new Error('endExperiment got invalid session id');

		const userId = await this.getOrMakeUser(sessId);

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

	async getOrMakeUser(sessId) {
		if (!sessId)
			throw new Error('getOrMakeUser got invalid session id');

		const maybeUserId =
			(await this.pg_main(this.tables.users).where('session_id', sessId).first('id'));

		if (maybeUserId) {
			console.log(`session id ${sessId} -> (already existing) user ${maybeUserId.id}`);
			return maybeUserId.id;
		}

		// make new user
		return this.logTransaction(this.pg_main(this.tables.users).insert({
			created_at: new Date(),
			updated_at: new Date(),
			session_id: sessId
		}).returning('id')).then(d => {
			console.log(`session id ${sessId} -> (new) user ${d[0]}`);
			return d[0];
		});
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





