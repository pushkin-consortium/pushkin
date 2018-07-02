module.exports = function(conn, channelName, body) {
  return new Promise((resolve, reject) => {
    return conn.createChannel((err, ch) => {
      if (err) {
        return reject(err);
      }
      // create a unique queue
      ch.sendToQueue(channelName, new Buffer(JSON.stringify(body)));
      ch.close();
      return resolve(null);
    });
  });
};
