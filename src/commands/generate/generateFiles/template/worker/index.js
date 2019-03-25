const pWorker = require('pushkin-worker').default;

const options = {
	readQueue: 'template_quiz_dbread',
	writeQueue: 'template_quiz_dbwrite',
	taskQueue: 'template_quiz_taskworker',
	amqpAddress: process.env.AMQP_ADDRESS || 'amqp://localhost'
};

const db_user = process.env.DB_USER;
const db_pass = process.env.DB_PASS;
const db_url = process.env.DB_URL;
const db_name = process.env.DB_NAME;

const db_conn_address = `postgres://${db_user}:${db_pass}@${db_url}/${db_name}`;

const worker = new pWorker(options);
worker.init()
	.then(() => {
		worker.handle('test', data => {
			console.log(`handling test method got data: ${data}`);
			return `successfully got ${data}`;
		});
		worker.useDefaultHandles(db_conn_address, 'template');
		worker.start();
	})
	.catch(err => {
		console.error(`failed to initialize worker: ${err}`);
	});

