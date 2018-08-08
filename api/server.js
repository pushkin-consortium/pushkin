let amqp = require('amqplib/callback_api');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const app = require('express')();
let rpc = require('./rpc');
const printer = require('./printer');
const logger = require('./logger.js');
const CONFIG = require('./config.js');
require('dotenv').config();
const uuid = require('uuid/v4');
const cookieSession = require('cookie-session');

const PORT = process.env.PORT;
const AMQP_ADDRESS = process.env.AMQP_ADDRESS || 'amqp://localhost';

// cookies
app.set('trust-proxy', 1);
app.use(cookieSession({
  name: 'session',
	maxAge: 24 * 60 * 60 * 1000,
  keys: ['oursupersecrectkeyforpreventingcookietampering']
}));
app.use( (req, res, next) => {
	console.log(`COOKIE?: ${JSON.stringify(req.session)}`);
	next();
});

app.use(bodyParser.json());
app.use(cors());

amqp.connect(AMQP_ADDRESS, function(err, conn) {
  if (err) return logger.error(err);

  app.use((req, res, next) => {
    logger.info(req.url);
    next();
  });

	// include custom quiz api controllers
	fs.readdirSync('./controllers')
		.filter(folder => fs.lstatSync(`./controllers/${folder}`).isDirectory())
		.forEach(controllerDir => {
			const short = controllerDir;
			const route = `/api/${short}`;
			const controller =
				require(`./controllers/${controllerDir}/index.js`)(rpc, conn);
			app.use(route, controller);
			console.log(`using controller for ${short}`);
		});

	// main routes/quiz independent
  if (CONFIG.forum) {
    const forumController = require('./forum')(rpc, conn);
    app.use('/api', forumController);
  }
  if (CONFIG.auth) {
    const authController = require('./auth')(rpc, conn);
    app.use('/api', authController);
  }

  app.get('/api/users', (req, res, next) => {
    var rpcInput = {
      method: 'allUsers'
    };
    const channelName = 'db_rpc_worker';
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });

  app.get('/api/mail/health', (req, res, next) => {
    var rpcInput = {
      method: 'health'
    };
    const channelName = 'mailer';
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });

  app.get('/api/routes', (req, res, next) => {
    const routes = printer(app);
    res.send(routes);
  });

  app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
  });

  app.use((err, req, res, next) => {
    res.status(500);
    res.json(err);
    logger.error(err.message);
  });

  app.listen(PORT, function() {
    // require('express-routemap')(app)
    //Callback triggered when server is successfully listening. Hurray!
    console.log('Server listening on: http://localhost:%s', PORT);
  });
});

module.exports = app;
