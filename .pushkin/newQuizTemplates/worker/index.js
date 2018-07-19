const AMQP_ADDRESS = 'amqp://localhost'; //process.env.AMQP_ADDRESS;
const QUEUE = '${QUIZ_NAME}_quiz_dbread';

const amqp = require('amqplib/callback_api');
const Handler = new (require('./handler'));
amqp.connect(AMQP_ADDRESS, (err, conn) => {
	if (err) {
		console.log(err);
		process.exit(1);
	}
	conn.createChannel( (err, ch) => {
		ch.assertQueue(QUEUE, {durable: false});
		ch.prefetch(1);
		ch.consume(QUEUE, msg => {
			Promise.resolve(msg.content.toString())
				.then(JSON.parse)
				.then(Handler.handle)
				.then(res => {
					if (res) {
						ch.sendToQueue(msg.properties.replyTo,
							new Buffer(JSON.stringify(res)),
							{correlationId: msg.properties.correlationId}
						);
					}
					ch.ack(msg);
				})
				.catch(err => {
					console.log(err);
					ch.sendToQueue(msg.properties.replyTo,
						new Buffer(JSON.stringify(err)),
						{correlationId: msg.properties.correlationId}
					);
				});
		});
	});
});

