const AMQP_ADDRESS = 'amqp://localhost'; //process.env.AMQP_ADDRESS;
const QUEUE = '${QUIZ_NAME}_quiz_dbread';

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
		ch.assertQueue(QUEUE, {durable: false});
		ch.prefetch(1);
		console.log(`consuming on ${QUEUE}`);
		ch.consume(QUEUE, msg => {
			console.log(`got message: ${msg.content.toString()}`);
			Promise.resolve(msg.content.toString())
				.then(JSON.parse)
				// javascript is ridiculous
				.then(Handler.handle.bind(Handler))
				.then(res => {
					if (res) {
						console.log(`responding ${JSON.stringify(res)}`);
						/*
						ch.sendToQueue(msg.properties.replyTo,
							new Buffer.from(JSON.stringify(res)),
							{correlationId: msg.properties.correlationId}
						);
						*/
					}
					else console.log('empty res');
					ch.ack(msg);
				})
				.catch(err => {
					console.log(err);
					/*
					ch.sendToQueue(msg.properties.replyTo,
						new Buffer(JSON.stringify(err)),
						{correlationId: msg.properties.correlationId}
					);
					*/
				});
		});
	});
});

