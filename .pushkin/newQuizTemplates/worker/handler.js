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
		this.test = 'asdfasdfasf';
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
			// user-specific endpoints
				case 'generateUser':
					break;
				case 'updateUser':
					break;
				case 'deleteUser':
					break;
				case 'insertStimulusResponse': // needs renaming (- Josh)
					break;
				case 'insertMetaResponse': // needs renaming (- Josh)
					break;
				case 'getUserStimulusResponses': // doesn't exist yet
					break;
				case 'getDataForPrediction': // doesn't exist yet
					break;
				case 'totalUserQuestions':
					requireDataFields(['user_id']);
					this.countUserResponses(req.data.user_id).then(resolve).catch(reject);
					break;


			// general endpoints
				case 'health':
					this.health().then(resolve).catch(reject);
					break;
				case 'clean':
					break;
				case 'getStimuli': // needs renaming (- Josh)
					break;
				case 'updateStimulusPriorities': // doesn't exist yet
					break;
				case 'activateStimuli': // doesn't exist yet
					break;
					// commenting out to discourage use
					//				case 'raw':
					//					break;
				case 'getAllStimuli':
					this.getAllStimuli().then(resolve).catch(reject);
					break;
				default:
					const errMsg = `method ${req.method} does not exist`;
					reject({ error: errMsg });
			}
		});
	}
	/*************** API METHODS ****************/
// user-specific endpoints
	countUserResponses(user) { // user must be a number
		return new Promise( (resolve, reject) => {
			this.pg_main('listener-quiz_stimulusResponses').count('*').where({ user_id: user })
				.then(resolve)
				.catch(reject)
		});
	}
// general endpoints
	getAllStimuli() {
		return new Promise( (resolve, reject) => {
			this.pg_main.select('*').from('listener-quiz_stimuli')
				.then(resolve)
				.catch(reject);
		});
	}
	health() {
		return new Promise( (resolve, reject) => {
			resolve({ message: 'healthy' });
		});
	}
}







