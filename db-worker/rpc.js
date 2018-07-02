// returns a promise that resolves to the result of the RPC
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

module.exports = function (conn, q, body) {

  return new Promise((resolve, reject) => {
    return conn.createChannel()
      .then(channel => {
        return conn.createChannel()
          .then(ch => {
            const corr = generateUuid();
            ch.consume(REPLY_QUEUE,
              msg => {
                if (msg.properties.correlationId == corr) {
                  const content = JSON.parse(msg.content.toString('utf8'));
                  resolve(content)
                }
              },
              {
                noAck: true
              })
            const payload = new Buffer(JSON.stringify(body));
            const options = {
              correlationId: corr,
              replyTo: REPLY_QUEUE,
              contentType: 'application/json',
              contentEncoding: 'utf-8'
            };
            return ch.sendToQueue(q,
              payload, options
            )
          })
      })

  })
};
function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}
