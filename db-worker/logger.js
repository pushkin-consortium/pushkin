const winston = require('winston');
const fs = require('fs');

const logDir = 'log';
const tsFormat = () => new Date().toLocaleTimeString();

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const transports = [];
let transport;
if (process.env.LOGGLY_TOKEN) {
  require('winston-loggly');
  transport = new winston.transports.Loggly({
    token: process.env.LOGGLY_TOKEN,
    subdomain: 'l3atbc',
    tags: ['Winston-NodeJS', 'db-worker'],
    json: true
  });
  transports.push(transport);
} else if (process.env.NODE_ENV == 'production') {
  transport = new winston.transports.File({
    filename: `${logDir}/results.log`,
    timestamp: tsFormat
  });
  transports.push(transport);
} else {
  transport = new winston.transports.Console();
  transports.push(transport)
}
const logger = new winston.Logger({
  transports
});
module.exports = logger;
