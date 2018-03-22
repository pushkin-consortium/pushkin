// returns a promise that resolves to the result of the RPC
const winston = require('./logger');
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

module.exports = function (conn, channelName, body) {
  return new Promise((resolve, reject) => {
    return conn.createChannel((err, ch) => {
      if (err) {
        return reject(err);
      }
      // create a unique queue
      // generate a unique id to  listen for unique responses
      var corr = generateUuid();
      ch.consume(
        REPLY_QUEUE,
        msg => {
          // When the connection is closed it sends a blank message
          // check to make sure this isnt that
          if (msg) {
            const content = JSON.parse(msg.content.toString('utf8'));
            winston.info('received', content);
            if (msg.properties.correlationId === corr) {
              ch.close();
              resolve(content);
            }
          }
        },
        {
          noAck: true
        }
      );
      return ch.sendToQueue(channelName, new Buffer(JSON.stringify(body)), {
        correlationId: corr,
        replyTo: REPLY_QUEUE
      });
    }
    );
  });
};
function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}
