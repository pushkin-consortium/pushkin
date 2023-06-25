import "core-js/stable";
import "regenerator-runtime/runtime";
import amqp from 'amqplib';
import knex from 'knex';
const trim = (s, len) => s.length > len ? s.substring(0, len) : s;

class PushkinWorker {
	constructor(options) {
		this.amqpAddress = options.amqpAddress;
		this.readQueue = options.readQueue;
		this.writeQueue = options.writeQueue;
		this.taskQueue = options.taskQueue;
		this.conn = undefined;
		this.initialized = false;
		this.handlers = new Map();
	}
	async init() {
		return new Promise((resolve, reject) => {
			amqp.connect(this.amqpAddress)  
				.then(conn => {      
					this.conn = conn;  
					this.initialized = true;        
					console.log('Worker connected to message queue');
					resolve();         
				})
				.catch(err => {
					reject(`Error connecting to message queue: ${err}`);
				});
		});
	}
	handle(method, handler) {
		console.log(`defining handler 2`)
		this.handlers.set(method, handler);
	}
	// useDefaultHandles(dbUrl, dbTablePrefix, transactionOps) {
	// 	const handler = new defaultHandler(dbUrl, dbTablePrefix, transactionOps);
	// 	defaultMethods.forEach(h => {
	// 		this.handle(h, handler[h].bind(handler));
	// 	});
	// }
	useHandler(ahandler, connection, dbTablePrefix, transactionOps) {
		console.log(`using handler ${ahandler}`);
		const handler = new ahandler(connection, dbTablePrefix, transactionOps);
		let methods = handler.methods();
		methods.forEach(h => {
			this.handle(h, handler[h].bind(handler));
		});
	}
	start() {
		this.conn.createChannel()
			.then(ch => {
				ch.assertQueue(this.readQueue, {durable: false});
				ch.assertQueue(this.writeQueue, {durable: true});
				ch.assertQueue(this.taskQueue, {durable: false});
				ch.prefetch(1);
				const consumeCallback = msg => {
					console.log(`got message: ${msg.content.toString()}`);
					Promise.resolve(JSON.parse(msg.content))
						.then(req => {
							if (!req || !req.method || req.data === undefined)
								throw new Error('requests must have a method and data field');
							// try to call a handler
							if (!this.handlers.has(req.method))
								throw new Error(`no handler found to handle method ${req.method}`);
							console.log(`handling with ${req.method}`)
							const sessId = req.sessionId;
							console.log(`handling with ${req.method}`)
							return this.handlers.get(req.method)(sessId, req.data, req.params);
						})
						.then(res => {
							// Is anyone actually reading this response? I don't think so...
							console.log(`responding ${JSON.stringify(res)}`);
							ch.sendToQueue(msg.properties.replyTo,
								new Buffer.from(JSON.stringify(res)),
								{correlationId: msg.properties.correlationId}
							);
							ch.ack(msg);
						})
						.catch(err => {
							console.error(err);
							ch.ack(msg);
							ch.sendToQueue(msg.properties.replyTo,
								new Buffer.from(JSON.stringify(err)),
								{ correlationId: msg.properties.correlationId }
							);
						});
				};
				console.log(`consuming on ${this.readQueue}`);
				ch.consume(this.readQueue, consumeCallback);
				console.log(`consuming on ${this.writeQueue}`);
				ch.consume(this.writeQueue, consumeCallback);
				console.log(`consuming on ${this.taskQueue}`);
				ch.consume(this.taskQueue, consumeCallback);
			})
			.catch(err => {
				console.error(`failed to created channel: ${err}`);
			});
	}
}

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
	constructor(connection, dbTablePrefix, transactionOps) {
		this.tables = {
			users: `pushkin_users`,
			userResults: `pushkin_userResults`,
			userMeta: `pushkin_userMeta`,
			stim: `${dbTablePrefix}_stimuli`,
			stimResp: `${dbTablePrefix}_stimulusResponses`,
			stimGroups: `${dbTablePrefix}_stimulusGroups`,
			stimGroupStim: `${dbTablePrefix}_stimulusGroupStimuli`
		};

		this.knexInfo = { 
			client: 'pg', 
			version: '11',
			connection: connection, 
			debug: true
		} //fubar -- get rid of debug

		this.pg_main = knex(this.knexInfo); 
		console.log(`checking logging`)
		console.log(transactionOps)
		this.logging = transactionOps ? true : false;
		if (this.logging) {
			try {
				this.trans_table = transactionOps.tableName;
				this.pg_trans = knex({ client: 'pg', connection: transactionOps.connection, debug: true }); //fubar get rid of debug when not needed
				//this.trans_mapper = transactionOps.mapper;	
			} catch (error) {
				console.error(`Problem setting up logger: ${error}`)
				console.error(`Turning off logging.`)
				this.logging = false;
			}
		}
		console.log(`Checked logging`)
	}

	async logTransaction(knexCommand) {
		console.log('this.logging: ', this.logging)
		if (!this.logging) return knexCommand;
//		const toInsert = this.trans_mapper(knexCommand.toString());
//		const toInsert = {
//			query: knexCommand.toString(),
//			bindings: '',
//			created_at: new Date()
//		}
//		console.log(`logging transaction: ${JSON.stringify(toInsert)}`)
		try {
			let temp
	//		await this.pg_trans(this.trans_table).insert(toInsert);
		} catch (error) {
			console.error(`Problem logging transaction: ${error}`)
		}
		return knexCommand;
	}

	async tabulateAndPostResults(sessId, data) {
		//this is just a stub. It should be overwritten in most cases.
		if (!sessId)
			throw new Error('startExperiment got invalid session id');
		if (!data.user_id)
			throw new Error('startExperiment got invalid userID');
		if (!data.experiment)
			throw new Error('startExperiment got invalid userID');

		const results = 'Completed this experiment with flying colors'; //stub

		return this.logTransaction(this.pg_main(this.tables.userResults).insert({
			user_id: data.user_id,
			experiment: data.experiment,
			results: results,
			created_at: new Date()
		}));
	}
	async startExperiment(sessId, data, params) {
		if (!sessId)
			throw new Error('startExperiment got invalid session id');
		if (!data.user_id)
			throw new Error('startExperiment got invalid userID');

		const userId = data.user_id;
		const toInsert = {
			user_id: userId,
			created_at: new Date()
		}
		console.log('to insert:\n ',toInsert)
		try {
			const userCount = (await this.pg_main(this.tables.users).where('user_id', userId).count('*'))[0].count;
		} catch (error) {
			console.error(`Problem checking if user exists: ${error}`)
			throw error
		}
		console.log('userCount: ', userCount)
		if (userCount>0) {
			console.log(`user ${userId} already exists. No need to recreate.`)
			//only need to insert if new subject
			return {user_id: userId}
		} else {
			console.log(`Adding ${userId} to users ${this.tables.users}.`)
			let returnVal
			try {
				returnVal = this.logTransaction(this.pg_main(this.tables.users).insert(toInsert));
			} catch (error) {
				console.error(`Problem inserting user: ${error}`)
				throw error
			}
			return returnVal
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

		let toInsert = {
			user_id: data.user_id,
			stimulus: JSON.stringify(data.data_string.stimulus).substring(0,1000),
			response: JSON.stringify(data.data_string),
			created_at: new Date()
		}
		console.log('to insert:\n ',toInsert)
		return this.logTransaction(this.pg_main(this.tables.stimResp).insert(toInsert));
	}

	async insertMetaResponse(sessId, data) {
		if (!sessId)
			throw new Error('insertStimulusResponse got invalid session id');
		if (!data.data_string)
			throw new Error('insertStimulusResponse got invalid response data string');
		if (!data.user_id)
			throw new Error('insertStimulusResponse got invalid userID');
		if (!data.stimulus)
			throw new Error('insertStimulusResponse got invalid stimulus');

		console.log(`inserting meta response for user ${data.user_id}: ${trim(JSON.stringify(data.data_string), 100)}`);
		return this.logTransaction(this.pg_main(this.tables.userMeta).insert({
			user_id: data.user_id,
			metaQuestion: JSON.stringify(data.stimulus),
			metaResponse: JSON.stringify(data.data_string),
			created_at: new Date()
		}));
	}

	methods() {
		const methods = [
			'getStimuli',
			'insertStimulusResponse',
			'startExperiment',
			'insertMetaResponse',
			'tabulateAndPostResults'
		]
		return methods;
	}
}

module.exports = {
	defaultHandler: DefaultHandler,
	pushkinWorker: PushkinWorker
};

