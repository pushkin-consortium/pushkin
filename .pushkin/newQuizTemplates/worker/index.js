const amqp = require('amqplib/callback_api');

const AMQP_ADDRESS = process.env.AMQP_ADDRESS;
const QUEUE = '${QUIZ_NAME}_quiz_dbread';

amqp.connect(AMQP_ADDRESS, (err, conn) => {
	if (err) {
		console.log(err);
		process.exit(1);
	}
	conn.createChannel( (err, ch) => {
		ch.assertQueue(QUEUE, {durable: false});
		ch.prefetch(1);
		ch.consume(QUEUE, msg => {
			const data = JSON.parse(msg.content.toString());
			console.log(`received rabbit message with data: ${data}`);

			// connect to databases and do stuff
			const r = { message: data };

			ch.sendToQueue(msg.properties.replyTo,
				new Buffer(JSON.stringify(r)),
				{correlationId: msg.properties.correlationId}
			);

			ch.ack(msg);
		});
	});
});

