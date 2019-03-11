import pushkin from 'pushkin-api';
import templateController from './controllers/template/';

const port = process.env.PORT || 3000;
const amqpAddress = process.env.AMQP_ADDRESS || 'amqp://localhost:5672';

const api = new pushkin.API(port, amqpAddress);

api.init()
	.then(() => {
		api.usePushkinController('/api/template', templateController);
		api.start();
	})
	.catch(console.error);
