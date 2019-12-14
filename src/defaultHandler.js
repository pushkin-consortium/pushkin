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

const methods = [
	'getStimuli',
	'insertStimulusResponse',
	'startExperiment'
]


class DefaultHandler {
	constructor(db_url, dbTablePrefix, transactionOps) {
		this.tables = {
			users: `${dbTablePrefix}_users`,
			stim: `${dbTablePrefix}_stimuli`,
			stimResp: `${dbTablePrefix}_stimulusResponses`,
			stimGroups: `${dbTablePrefix}_stimulusGroups`,
			stimGroupStim: `${dbTablePrefix}_stimulusGroupStimuli`
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

	async startExperiment(data) {
		if (!data.user_id)
			throw new Error('getStimuli got invalid userID');
		const userId = data.user_id;
		const userCount = (await this.pg_main(this.tables.users).where('user_id', userId).count('*'))[0].count;
		if (userCount>0) {
			//only need to insert if subject has never done this experiment below
			return 
		} else {
			return this.logTransaction(this.pg_main(this.tables.users).insert({
				user_id: data.user_id,
				created_at: new Date()
			}));
		}
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

	methods(){
		return methods;
	}
}

module.exports = {
	defaultHandler: DefaultHandler,
	defaultMethods: methods
};





