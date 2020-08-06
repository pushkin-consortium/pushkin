const workers = require('pushkin-worker');
const pWorker = workers.pushkinWorker;
const defaultHandler = workers.defaultHandler;

const options = {
	amqpAddress: process.env.AMQP_ADDRESS || 'amqp://localhost',
	readQueue: 'pushkintemplate_quiz_dbread',
	writeQueue: 'pushkintemplate_quiz_dbwrite',
	taskQueue: 'pushkintemplate_quiz_taskworker',
};

const db_user = process.env.DB_USER;
const db_pass = process.env.DB_PASS;
const db_url = process.env.DB_URL;
const db_name = process.env.DB_NAME;

const db_conn_address = process.env.DB_SMARTURL || `postgres://${db_user}:${db_pass}@${db_url}/${db_name}`;

const worker = new pWorker(options);
worker.init()
	.then(() => {
		worker.handle('test', data => {
			console.log(`handling test method got data: ${data}`);
			return `successfully got ${data}`;
		});
		worker.useHandler(defaultHandler, db_conn_address, 'pushkintemplate');
		worker.start();
	})
	.catch(err => {
		console.error(`failed to initialize worker: ${err}`);
	});

