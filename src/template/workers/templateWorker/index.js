const pWorker = require('pushkin-worker').default;

const options = {
	readQueue: 'template_quiz_dbread',
	writeQueue: 'template_quiz_dbwrite',
	taskQueue: 'template_quiz_taskworker',
	amqpAddress: process.env.AMQP_ADDRESS || 'amqp://localhost'
};
const db_url = process.env.DATABASE_URL || 'postgres://postgres:@localhost/test_db';

const worker = new pWorker(options);
worker.init()
	.then(() => {
		worker.handle('test', data => {
			console.log(`handling test method got data: ${data}`);
			return `successfully got ${data}`;
		});
		worker.useDefaultHandles(db_url, 'template');
		worker.start();
	})
	.catch(err => {
		console.error(`failed to initialize worker: ${err}`);
	});

