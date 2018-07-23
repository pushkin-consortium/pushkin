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

			// user-specific endpoints
				case 'generateUser':
					requireDataFields(['user_id', 'auth_id']);
					const user = req.data.user_id;
					const auth = req.data.auth;
					this.createUser(user, auth).then(resolve).catch(reject);
					break;

				case 'updateUser':
					requireDataFields(['user_id', 'auth_id']);
					const user = req.data.user_id;
					const auth = req.data.auth;
					this.updateUser(user, auth).then(resolve).catch(reject);
					break;

				case 'startExperiment':
					// no data fields to require
					resolve('no prep needed to start experiment, ready');
					break;

				case 'getAllStimuli':
					// no data fields to require
					this.getAllStimuli().then(resolve).catch(reject);
					break;

				case 'insertMetaResponse':
					requireDataFields(['user_id', 'data_string']);
					const user = req.data.user_id;
					const dataString = req.data.dataString;
					this.insertMetaResponse(user, dataString).then(resolve).catch(reject);
					break;

				case 'insertStimulusResponse':
					requireDataFields(['user_id', 'data_string']);
					const user = req.data.user_id;
					const dataString = req.data.data_string;
					this.deleteUser(user, dataString).then(resolve).catch(reject);
					break;

				case 'nextStimulus':
					requireDataFields(['user_id']);
					this.getNextStimulus(req.data.user_id).then(resolve).catch(reject);
					break;

				case 'getFeedback':
					requireDataFields(['user_id']);
					this.getFeedback(req.data.user_id).then(resolve).catch(reject);
					break;

				case 'activateStimuli':
					// no data fields to require
					this.activateStimuli().then(resolve).catch(reject);
					break;

				case 'health':
					this.health().then(resolve).catch(reject);
					break;

				default:
					const errMsg = `method ${req.method} does not exist`;
					reject({ error: errMsg });
			}
		});
	}
	/*************** API METHODS ****************/
// user-specific meta endpoints
	createUser(user, auth) {
		return new Promise( (resolve, reject) => {
			this.pg_main('listener-quiz_users').count('*').where({ id: user })
				.then(res => {

				})
				.catch(reject);
		});
	}
	updateUser(user, auth) {

	}
	deleteUser(user, auth) {

	}
// user-specific quiz endpoints
	insertStimulusResponse(user, dataString) {

	}
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







