import amqp from 'amqplib';
import { defaultHandler, defaultMethods }from './defaultHandler.js';

export default class Worker {
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
	useDefaultHandles(dbUrl, dbTablePrefix, transactionOps) {
		const handler = new defaultHandler(dbUrl, dbTablePrefix, transactionOps);
		defaultMethods.forEach(h => {
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
							console.log(req);
							console.log(`sessionID: ${req.sessionId}`);
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
