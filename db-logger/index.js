const amqp = require('amqplib');

const AMQP_ADDRESS = process.env.AMQP_ADDRESS;
const QUEUE = process.env.QUEUE;

amqp.connect(AMQP_ADDRESS).then(conn => {

	process.once('SIGINT', () => conn.close() );

	return conn.createChannel()
		.then(ch => {
			ch.assertQueue(QUEUE, {durable: true})
				.then(() => {
					ch.prefetch(1);

					const reply = msg => {
						const response = '{ "response": "the response" }';

						ch.sendToQueue(msg.properties.replyTo,
							Buffer.from(response.toString()),
							{correlationId: msg.properties.correlationId});

						ch.ack(msg);
					};

					return ch.consume(QUEUE, reply);
				})
				.then(() => {
					console.log(' [x] Awaiting RPC requests');
				});
		});
}).catch(console.warn);
