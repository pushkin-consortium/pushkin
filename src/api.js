import express from 'express';
import amqp from 'amqplib';
import { v4 as uuid } from 'uuid';
import bodyParser from 'body-parser';
import cookieSession from 'cookie-session';

export default class PushkinAPI {
	constructor(expressPort, amqpAddress) {
		this.expressPort = expressPort;
		this.amqpAddress = amqpAddress;
		this.initialized = false;

		this.app = express();
		this.app.set('trust-proxy', 1);
		this.app.use(cookieSession({
			name: 'session',
			maxAge: 24 * 60 * 60 * 1000,
			keys: ['oursupersecrectkeyforpreventingcookietampering']
		}));
		this.app.use( (req, res, next) => {
			req.session.id = req.session.id || uuid();
			console.log(`API got request for ${req}`);
			next();
		});
		this.app.use(bodyParser.json());
		this.expressListening = false;
		this.server = null;
	}

	async init() {
		return new Promise((resolve, reject) => {
			amqp.connect(this.amqpAddress)
				.then(conn => {
					this.conn = conn;
					this.initialized = true;
					console.log('API init connected');
					resolve();
				})
				.catch(err => {
					reject(`Error connecting to message queue: ${err}`);
				});
		});
	}

	useController(route, controller) {
		if (this.expressListening)
			throw new Error('Unable to add controllers after the API has started.');
		console.log('API using controller');
		this.app.use(route, controller); }

	usePushkinController(route, pushkinController) {
		if (this.expressListening)
			throw new Error('Unable to add controllers after the API has started.');
		if (!this.initialized)
			throw new Error('The API must first be initialized by calling .init().');
		this.useController(route, pushkinController.getConnFunction()(this.conn));
	}

	//enableCoreRoutes() { this.usePushkinController('/api', coreRouter); }

	start() {
		if (!this.initialized)
			throw new Error('The API hasn\'t been successfully initialized');
		this.expressListening = true;
		this.server = this.app.listen(this.expressPort, async () => {
			console.log(`Pushkin API listening on port ${this.expressPort}`);
		});
	}

}
