/*******
 * To make ready for template:
 *	- replace all 'listener-quiz' with '${QUIZ_NAME}'
 *	- put db urls back to process environment variables
 *	- uncomment sending responses in index.js (sendToQueue)
 ************/

module.exports = class Handler {
	constructor() {
		const MAIN_DB_URL = 'postgres://pushkin:jacob_password@pushkin-data-db.co4mo5lsfmqs.us-east-2.rds.amazonaws.com/pushkin_data_db';//process.env.DATABASE_URL;
			const TRANS_DB_URL = 'postgres://pushkin:jacob_password@pushkin-transaction-db.co4mo5lsfmqs.us-east-2.rds.amazonaws.com/pushkin_transaction_db';//process.env.TRANSACTION_DATABASE_URL;
		this.pg_main = require('knex')({
			client: 'pg',
			connection: MAIN_DB_URL,
		});
		this.pg_trans = require('knex')({
			client: 'pg',
			connection: TRANS_DB_URL,
		});
	}
	// HTTP request, 
	handle(req) {
		return new Promise( (resolve, reject) => {
			// some methods send '' as the data string when none is needed
			// so check for undefined rather than truthyness
			if (!req || !req.method || req.data === undefined) {
				const errMsg = 'invalid request. Requests must have a method and data field';
				reject({ error: errMsg });
				return; // while the promise cannot be unrejected, the rest of the code
								// nevertheless will continue to execute, which is a waste
			}

			// each method in the switch statement below should use this function to ensure
			// all its required fields are present
			const requireDataFields = fields => {
				const missing =
					(typeof req.data == 'object' ?
						fields.reduce( (acc, field) => ((field in req.data) ? acc : [...acc, field]), [])
						: fields
					);
				if (missing.length > 0) {
					reject({ error: `${req.method}'s data must have ${fields} as data. Missing ${missing}` });
					return;
				}
			};

			// using a mapping like this is nicer than calling something like "this[req.method]" because
			// it allows us to have other functions without exposing them all to the api
			switch (req.method) {

			// methods called through API controller
				case 'generateUser':
					requireDataFields(['user_id', 'auth_id']);
					const user = req.data.user_id;
					const auth = req.data.auth;
					return this.createUser(user, auth)
					break;

				case 'updateUser':
					requireDataFields(['user_id', 'auth_id']);
					const user = req.data.user_id;
					const auth = req.data.auth;
					return this.updateUser(user, auth)
					break;

				case 'getAllStimuli':
					// no data fields to require
					return this.getAllStimuli()
					break;

				case 'insertMetaResponse':
					requireDataFields(['user_id', 'data_string']);
					const user = req.data.user_id;
					const dataString = req.data.dataString;
					return this.insertMetaResponse(user, dataString);
					break;

				case 'insertStimulusResponse':
					requireDataFields(['user_id', 'stimulus', 'data_string']);
					const user = req.data.user_id;
					const stimulus = req.data.stimulus;
					const dataString = req.data.data_string;
					return this.insertStimulusResponse(user, stimulus, dataString);
					break;

				case 'activateStimuli':
					// no data fields to require
					return this.activateStimuli();
					break;

				case 'health':
					return this.health();
					break;

			// methods used by other services (e.g. cron or task worker)
				case 'getUserStimulusResponses':
					requireDataFields(['user_id']);
					return this.getUserStimulusResponses(req.data.user_id);
					break;

				case 'getDataForPrediction':
					requireDataFields(['user_id']);
					return this.getDataForPrediction(req.data.user_id);
					break;

				default:
					const errMsg = `method ${req.method} does not exist`;
					reject({ error: errMsg });
			}
		});
	}

	/*************** METHODS CALLED BY HANDLER & HELPER FUNCTIONS ****************/
	userExists(user) {
		return new Promise( (resolve, reject) => {
			// better to resolve false than reject the promise because then actual
			// errors with connection, etc. may be interpreted as the user not existing
			this.pg_main('listener-quiz_users').count('*').where('id', user)
				.then(res => resolve(res ? true : false))
				.catch(reject);
		});
	}
	async createUser(user, auth) {
		return new Promise( (resolve, reject) => {
			this.userExists(user)
				.then(exists => {
					if (exists) {
						reject(`user ${user} already exists`);
						return;
					}

					const insertData = {
						id: user,
						auth_id: auth,
						created_at: new Date(),
						updated_at: new Date()
					};
					this.pg_main('listener-quiz_users').insert(insertData)
						.then(resolve)
						.catch(reject);
				})
				.catch(reject);
		});
	}
	updateUser(user, auth) {
		return new Promise( (resolve, reject) => {
			this.userExists(user)
				.then(exists => {
					if (exists) {
						reject(`user ${user} already exists`);
						return;
					}

					this.pg_main('listener-quiz_users')
						.where('id', user)
						.update({ auth_id: auth })
						.then(resolve)
						.catch(reject);
				})
				.catch(reject);
		});
	}
	getAllStimuli() {
		return new Promise( (resolve, reject) => {
			this.pg_main.select().table('listener-quiz_stimuli')
				.then(resolve)
				.catch(reject);
		});
	}
	insertMetaResponse(user, dataString) {
		return new Promise( (resolve, reject) => {
			const insertData = {
				user_id: user,
				data_string: dataString,
				created_at: new Date(),
				updated_at: new Date()
			};
			this.pg_main('listener-quiz_responses').insert(insertData)
				.then(resolve)
				.catch(reject);
		});
	}
	insertStimulusResponse(user, stimulus, dataString) {
		return new Promise( (resolve, reject) => {
			const insertData = {
				user_id: user,
				stimulus: stimulus,
				data_string: dataString,
				created_at: new Date(),
				updated_at: new Date()
			};
			this.pg_main('listener-quiz_stimulusResponses').insert(insertData)
				.then(resolve)
				.catch(reject);
		});
	}
	getNextStimulus(user) {
		return new Promise( (resolve, reject) => {
			reject('getNextStimulus in handler not yet implemented. What exactly should it do?');
		});
	}
	activateStimuli() {
		return new Promise( (resolve, reject) => {
			reject('activateStimuli in handler not yet implemented. Table structure not in place.');
		});
	}
	health() {
		return new Promise( (resolve, reject) => {
			resolve({ message: 'healthy' });
		});
	}
	getUserStimulusResponses(user) {
		return new Promise( (resolve, reject) => {
			this.pg_main('listener-quiz_stimulusResponses')
				.where('id', user)
				.select('*')
				.then(resolve)
				.catch(reject);
		});
	}
	getDataForPrediction(user) {
		return new Promise( (resolve, reject) => {
			reject('getDataForPrediction: should this do the same as getUserStimulusResponses?');
		});
	}
}







