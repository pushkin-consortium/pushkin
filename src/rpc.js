import uuid from 'uuid/v4';
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

// returns a promise that resolves to the result of the RPC
export default (conn, channelName, body) => {
	console.log(`rpc got call (${conn}, ${channelName}, ${JSON.stringify(body)})`);
	return new Promise( (resolve, reject) => {
		return conn.createChannel()
			.then(ch => {
				const corr = uuid();

				const received = msg => {
					console.log(`received msg not necessarily for us: ${JSON.stringify(msg)}`);
					if (!msg) {
						console.log('got falsy message');
						return; // connection closed sends blank message
					}
					if (msg.properties.correlationId !== corr) {
						console.log('got message with different corr id');
						return; // not a message for us
					}

					const content = JSON.parse(msg.content.toString('utf8'));
					console.log(`RPC received: ${JSON.stringify(content)}`);
					ch.close();
					resolve(content);
				};

				ch.consume(REPLY_QUEUE, received, { noAck: true });

				return ch.sendToQueue(channelName, new Buffer(JSON.stringify(body)), {
					correlationId: corr,
					replyTo: REPLY_QUEUE
				});

			})
			.catch(err => {
				console.error(err);
				reject(err);
			});
	});
};
