const AMQP_ADDRESS = process.env.AMQP_ADDRESS || 'amqp://localhost';
const READ_QUEUE = 'miniexample_quiz_dbread';
const WRITE_QUEUE = 'miniexample_quiz_dbwrite';
const TASK_QUEUE = 'miniexample_quiz_taskworker'; // eventually this should be moved to a separate thing

const amqp = require('amqplib/callback_api');
const Handler = new (require('./handler'))();

amqp.connect(AMQP_ADDRESS, (err, conn) => {
	if (err) {
		console.log(err);
		process.exit(1);
	}
	conn.createChannel( (err, ch) => {
		if (err) {
			console.log(err);
			process.exit(1);
		}
		ch.assertQueue(READ_QUEUE, {durable: false});
		ch.assertQueue(WRITE_QUEUE, {durable: true});
		ch.assertQueue(TASK_QUEUE, {durable: false});
		ch.prefetch(1);
		const consumeCallback = msg => {
			console.log(`got message: ${msg.content.toString()}`);
			Promise.resolve(msg.content.toString())
				.then(JSON.parse)
				// nobody should ever have to do this
				.then(Handler.handle.bind(Handler))
				.then(res => {
					if (res) {
						console.log(`responding ${JSON.stringify(res)}`);
						ch.sendToQueue(msg.properties.replyTo,
							new Buffer.from(JSON.stringify(res)),
							{correlationId: msg.properties.correlationId}
						);
					}
					else console.log('empty res');
					ch.ack(msg);
				})
				.catch(err => {
					console.log(err);
					ch.ack(msg);
					ch.sendToQueue(msg.properties.replyTo,
						new Buffer.from(JSON.stringify(err)),
						{correlationId: msg.properties.correlationId}
					);
				});
		};
		console.log(`consuming on ${READ_QUEUE}`);
		ch.consume(READ_QUEUE, consumeCallback);
		console.log(`consuming on ${WRITE_QUEUE}`);
		ch.consume(WRITE_QUEUE, consumeCallback);
		console.log(`consuming on ${TASK_QUEUE}`);
		ch.consume(TASK_QUEUE, consumeCallback);
	});
});





