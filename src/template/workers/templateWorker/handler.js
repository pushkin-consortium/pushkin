const crypto = require('crypto');
const trim = require('./trim').trim;

module.exports = class Handler {
	constructor() {
		const MAIN_DB_URL = 
			process.env.DATABASE_URL;

		//const TRANS_DB_URL = 'postgres://pushkin:jacob_password@pushkin-transaction-db.co4mo5lsfmqs.us-east-2.rds.amazonaws.com/pushkin_transaction_db';//process.env.TRANSACTION_DATABASE_URL;
		this.tables = {
			users: 'template_users',
			stim: 'template_stimuli',
			stimResp: 'template_stimulusResponses',
			stimGroups: 'template_stimulusGroups',
			stimGroupStim: 'template_stimulusGroupStimuli',
			TUQ: 'template_TUQ',
			TUQSR: 'template_TUQSR',
		};

		this.pg_main = require('knex')({
			client: 'pg',
			connection: MAIN_DB_URL,
		});
		/*
		this.pg_trans = require('knex')({
			client: 'pg',
			connection: TRANS_DB_URL,
		});
		*/
	}

	// returns a promise with the requested data (if any)
	// throws an error if the method doesn't exist
	async handle(req) {
			// some methods send '' as the data string when none is needed
			// so check for undefined rather than truthyness
			if (!req || !req.method || req.data === undefined)
				throw new Error('invalid request. Requests must have a method and data field');

			// each method in the switch statement below should use this function to ensure
			// all its required fields are present
			const requireDataFields = fields => {
				const missing =
					(typeof req.data == 'object' ?
						fields.reduce( (acc, field) => ((field in req.data) ? acc : [...acc, field]), [])
						: fields
					);
				if (missing.length > 0)
					throw new Error(`${req.method}'s req.data must have fields ${fields}. Missing ${missing}`);
			};

		// using a mapping like this is nicer than calling something like "this[req.method]" because
		// it allows us to have other functions without exposing them all to the api
		// as well as require the pertinent fields
		
			switch (req.method) {

			// methods called through API controller

				case 'startExperiment':
					return this.startExperiment(req.sessionId);

				case 'getStimuli':
					return this.getStimuli(req.sessionId);

				case 'insertMetaResponse':
					// 'type' must match a column in the database's user table
					requireDataFields(['type', 'response']);
					return this.insertMetaResponse(req.sessionId, req.data.type, req.data.response);

				case 'insertStimulusResponse':
					requireDataFields(['data_string']);
					return this.insertStimulusResponse(req.sessionId, req.data.data_string);

				case 'endExperiment':
					return this.endExperiment(req.sessionId);

				default:
					throw new Error(`method ${req.method} does not exist`);
			}
	}

	/*************** METHODS CALLED BY HANDLER & HELPER FUNCTIONS (all return promises) ****************/
	/*** methods that don't return anything meaningful should return 0 as a status code 
	 *	 because axios wants a response in the front end ***/


	async startExperiment(sessId) {
		const userId = await this.getOrMakeUser(sessId);

		// check if the user already has a TUQ record
		const tuqCount = (await this.pg_main(this.tables.TUQ).where('user_id', userId).count('*'))[0].count;
		if (tuqCount > 0)
			throw new Error(`user ${userId} already has a TUQ record, aborting`);

		// good to go
		const maxStimuli = 4;
		console.log(`starting experiment for user ${userId} with ${maxStimuli} max stimuli`);

		// create a stimulus group (stimGroups) (for this experiment, we'll just
		// make a new group for each quiz run rather than reusing them)
		const stimGroupId = (await this.pg_main(this.tables.stimGroups)
			.insert({ created_at: new Date() }).returning('id'))[0];

		console.log(`assigned user ${userId} stimulus group ${stimGroupId}`);

		const selectedStims = await this.pg_main(this.tables.stim)
			.select('id').orderByRaw('random()').limit(maxStimuli);

		console.log(`selected ${selectedStims.length} stimuli for group ${stimGroupId}`);

		// add stimuli to the group (stimGroupStim)
		let position = 0;
		await this.pg_main(this.tables.stimGroupStim).insert(
			selectedStims.map(stim => ({
				group: stimGroupId,
				stimulus: stim.id,
				position: position++
			}))
		);

		console.log(`added ${selectedStims.length} stimuli to group ${stimGroupId}`);

		// initialize This User Quiz (TUQ)
		await this.pg_main(this.tables.TUQ).insert({
			user_id: userId,
			stim_group: stimGroupId,
			started_at: new Date(),
			cur_position: 0
		});

		console.log(`created new TUQ record for user ${userId}`);
		console.log(`done starting experiment for user ${userId}`);

		return 0; // success
	}

	async getStimuli(sessId) {
		const userId = await this.getOrMakeUser(sessId);
		return this.pg_main(this.tables.TUQ).where('user_id', userId).select('stim_group')
			.then(g => {
				if (g.length < 1)
					throw new Error(`getStimuli: user ${userId} doesn't have a TUQ record, aborting`);

				const stimGroupId = g[0].stim_group;
				console.log(`getStimuli: getting user ${userId} stimuli from group ${stimGroupId}`);

				return this.pg_main(this.tables.stim).join(
					this.tables.stimGroupStim,
					`${this.tables.stim}.id`,
					`${this.tables.stimGroupStim}.stimulus`
				).where(`${this.tables.stimGroupStim}.group`, stimGroupId)
					.select(`${this.tables.stim}.stimulus`);
			});
	}

	async insertMetaResponse(sessId, type, response) {
		// these should match columns in the users table that contain meta info
		const validMetaColumns = [ 'dob', 'native_language' ];
		if (validMetaColumns.indexOf(type) <= -1)
			throw new Error(`insertMetaResponse: user ${userId} attempted to save meta to an invalid column "${type}"`);

		const userId = await this.getOrMakeUser(sessId);

		return this.pg_main(this.tables.users).where('id', userId).first(type)
			.then(maybeTypeData => {
				const e = maybeTypeData[type];
				console.log(`${e ? 'changing' : 'setting'} user ${userId}'s ${type} to "${trim(response, 30)}"`);
				return this.pg_main(this.tables.users).where('id', userId).update(type, response);
			}).then(_ => 0);
	}

	async insertStimulusResponse(sessId, response) {
		const userId = await this.getOrMakeUser(sessId);
		console.log(`inserting response for user ${userId}: ${trim(JSON.stringify(response), 100)}`);

		// DO CHECKS (not past end of experiment, etc.)

		return this.pg_main(this.tables.TUQ).where('user_id', userId).first('stim_group', 'cur_position')
			.then(t => {
				return this.pg_main(this.tables.stimGroupStim)
					.where({
						group: t.stim_group,
						position: t.cur_position
					}).first('stimulus')
			}).then(stimRes => {
				return this.pg_main(this.tables.TUQSR).insert({
					user_id: userId,
					stimulus: stimRes.stimulus,
					response: JSON.stringify(response),
					answered_at: new Date()
				});
			}).then(_ => {
				console.log(`incrementing user ${userId}'s cur_position`);
				return this.pg_main(this.tables.TUQ).where('user_id', userId).increment('cur_position');
			}).then(_ => 0);
	}

	async endExperiment(sessId) {
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
				return this.pg_main(this.tables.stimResp).insert(res);
			}).then(_ => {
				// delete TUQSRs
				console.log(`deleting user ${userId}'s temp responses`);
				return this.pg_main(this.tables.TUQSR).where('user_id', userId).del();
			}).then(_ => {
				// delete TUQ record
				console.log(`removing user ${userId}'s TUQ record`);
				return this.pg_main(this.tables.TUQ).where('user_id', userId).del();
			}).then(_ => 0);
	}

	/*************** helpers **************/

	async getOrMakeUser(sessId) {
		const maybeUserId =
			(await this.pg_main(this.tables.users).where('session_id', sessId).first('id'));

		if (maybeUserId) {
			console.log(`session id ${sessId} -> (already existing) user ${maybeUserId.id}`);
			return maybeUserId.id;
		}

		// make new user
		return this.pg_main(this.tables.users).insert({
			created_at: new Date(),
			updated_at: new Date(),
			session_id: sessId
		}).returning('id').then(d => {
			console.log(`session id ${sessId} -> (new) user ${d[0]}`);
			return d[0];
		});
	}

}







