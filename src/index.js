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
		console.log(`handling ${method} with ${handler}`);
		this.handlers.set(method, handler);
	}
	// useDefaultHandles(dbUrl, dbTablePrefix, transactionOps) {
	// 	const handler = new defaultHandler(dbUrl, dbTablePrefix, transactionOps);
	// 	defaultMethods.forEach(h => {
	// 		this.handle(h, handler[h].bind(handler));
	// 	});
	// }
	useHandler(ahandler, dbUrl, dbTablePrefix, transactionOps) {
		const handler = new ahandler(dbUrl, dbTablePrefix, transactionOps);
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
					Promise.resolve(msg.content.toString())
						.then(JSON.parse)
						.then(req => {
							if (!req || !req.method || req.data === undefined)
								throw new Error('requests must have a method and data field');
							// try to call a handler
							if (!this.handlers.has(req.method))
								throw new Error(`no handler found to handle method ${req.method}`);
							const sessId = req.sessionId;
							return this.handlers.get(req.method)(sessId, req.data, req.params);
						})
						.then(res => {
							console.log(`responding ${res}`);
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
	constructor(db_url, dbTablePrefix, transactionOps) {
		this.tables = {
			users: `pushkin_users`,
			userResults: `pushkin_userResults`,
			userMeta: `pushkin_userMeta`,
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

	async tabulateAndPostResults(sessId, data) {
		//this is just a stub. It should be overwritten in most cases.
		if (!sessId)
			throw new Error('startExperiment got invalid session id');
		if (!data.user_id)
			throw new Error('startExperiment got invalid userID');
		if (!data.experiment)
			throw new Error('startExperiment got invalid userID');

		const results = 'Completed this experiment with flying colors'; //stub

		return this.logTransaction(this.pg_main(this.tables.users).insert({
			user_id: data.user_id,
			experiment: data.experiment,
			results: results,
			created_at: new Date()
		});
	}

	async startExperiment(sessId, data) {
		if (!sessId)
			throw new Error('startExperiment got invalid session id');
		if (!data.user_id)
			throw new Error('startExperiment got invalid userID');

		const userId = data.user_id;

		const userCount = (await this.pg_main(this.tables.users).where('user_id', userId).count('*'))[0].count;
		if (userCount>0) {
			//only need to insert if new subject
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
			stimulus: JSON.stringify(data.data_string.stimulus),
			response: JSON.stringify(data.data_string),
			created_at: new Date()
		}));
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

