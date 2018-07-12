// returns a promise that resolves to the result of the RPC
const winston = require('./logger');
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

function generateUuid() {
	return (
		Math.random().toString() +
		Math.random().toString() +
		Math.random().toString()
	);
}

module.exports = function (conn, channelName, body) {
	return new Promise((resolve, reject) => {

		return conn.createChannel((err, ch) => {

			if (err) return reject(err);

			// create a unique queue
			// generate a unique id to  listen for unique responses
			const corr = generateUuid();

			const received = msg => {
				// When the connection is closed it sends a blank message
				// check to make sure this isnt that
				if (!msg) return;
				if (msg.properties.correlationId !== corr) return;

				const content = JSON.parse(msg.content.toString('utf8'));
				winston.info('received', content);
				ch.close();
				resolve(content);
			};

			ch.consume(REPLY_QUEUE, received, { noAck: true });

			return ch.sendToQueue(channelName, new Buffer(JSON.stringify(body)), {
				correlationId: corr,
				replyTo: REPLY_QUEUE
			});
		});

	});
};

