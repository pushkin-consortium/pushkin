import pushkin from 'pushkin-api';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT || 3000;
const amqpAddress = process.env.AMQP_ADDRESS || 'amqp://localhost:5672';
const production = process.env.NODE_ENV || false

console.log('port: ', port, 'amqpAddress: ', amqpAddress, 'production: ', production)//FUBAR

const api = new pushkin.API(port, amqpAddress);

api.init()
	.then(() => {
		// load in user controllers
		const controllersFile = path.join(__dirname, 'controllers.json');
		const controllers = JSON.parse(fs.readFileSync(controllersFile));
		Object.keys(controllers).forEach(controller => {
			let pathExt = (production ? '/' : '/api/')
			const mountPath = path.join(pathExt, controllers[controller]);
			console.log('mountPath: ', mountPath)
			const contrModule = require(controller);
			console.log("Mounting ", controller);
			api.usePushkinController(mountPath, contrModule); 
		});
		api.start();
	})
	.catch(console.error);