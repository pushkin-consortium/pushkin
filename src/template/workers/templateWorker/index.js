const AMQP_ADDRESS = process.env.AMQP_ADDRESS || 'amqp://localhost';
const READ_QUEUE = 'template_quiz_dbread';
const WRITE_QUEUE = 'template_quiz_dbwrite';
const TASK_QUEUE = 'template_quiz_taskworker'; // eventually this should be moved to a separate thing
const trim = require('./trim').trim;

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
			console.log(`got message: ${trim(msg.content.toString(), 100)}`);
			Promise.resolve(msg.content.toString())
				.then(JSON.parse)
				// nobody should ever have to do this
				.then(Handler.handle.bind(Handler))
				.then(res => {
					if (res || res == 0) { // 0 is used for success by "void" methods
						console.log(`responding ${trim(JSON.stringify(res), 100)} ${res==0?'(success)':''}`);
						ch.sendToQueue(msg.properties.replyTo,
							new Buffer.from(JSON.stringify(res)),
							{correlationId: msg.properties.correlationId}
						);
					}
					else throw new Error('Empty response from Handler.handle; send 0 if nothing else meaninful (and truthy) to send');
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





