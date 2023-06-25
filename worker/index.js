const workers = require('pushkin-worker');
const transInfo = require('../../../pushkin.yaml')
const pWorker = workers.pushkinWorker;
const defaultHandler = workers.defaultHandler;

const options = {
	amqpAddress: process.env.AMQP_ADDRESS || 'amqp://localhost',
	readQueue: 'pushkintemplate_quiz_dbread',
	writeQueue: 'pushkintemplate_quiz_dbwrite',
	taskQueue: 'pushkintemplate_quiz_taskworker',
};

const connection = {
	host: process.env.DB_URL,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: process.env.DB_NAME,
};

const transactionOps = {
	tableName: "transactions",
	connection: {
		host: transInfo.databases.localtransactiondb.host,
		user: transInfo.databases.localtransactiondb.user,
		password: transInfo.databases.localtransactiondb.pass,
		database: transInfo.databases.localtransactiondb.name,
		port: transInfo.databases.localtransactiondb.port
	}
}

console.log(connection);

const worker = new pWorker(options);
worker.init()
	.then(() => {
		worker.handle('test', data => {
			console.log(`handling test method got data: ${data}`);
			return `successfully got ${data}`;
		});
		worker.useHandler(defaultHandler, connection, 'pushkintemplate', transactionOps);
		worker.start();
	})
	.catch(err => {
		console.error(`failed to initialize worker: ${err}`);
	});

