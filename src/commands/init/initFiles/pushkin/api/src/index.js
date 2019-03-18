import pushkin from 'pushkin-api';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT || 3000;
const amqpAddress = process.env.AMQP_ADDRESS || 'amqp://localhost:5672';

const api = new pushkin.API(port, amqpAddress);

api.init()
	.then(() => {
		// load in user controllers
		const controllersFile = path.join(__dirname, 'controllers.json');
		const controllers = JSON.parse(fs.readFileSync(controllersFile));
		controllers.forEach(controller => {
			const mountPath = path.join('/api/', controller.mountPath);
			const contrModule = require(controller.name);
			console.log(contrModule);
			api.usePushkinController(mountPath, contrModule);
		});
		api.start();
	})
	.catch(console.error);
