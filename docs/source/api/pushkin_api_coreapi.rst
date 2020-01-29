.. _pushkin_api_coreapi:

Core API
============
The Core API provides some methods which Pushkin can use to load users's controllers. It will initilize the controllers and the connections with message queues, set up multiple middlewares, and start the server. The Core API of Pushkin works like this::

   import pushkin from 'pushkin-api';

   const port = 3000;
   const amqpAddress = 'amqp://localhost:5672';

   const api = new pushkin.API(port, amqpAddress);

   api.init()
	.then(() => {
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

The first line imports the API and the following three create an api. After executing ``api.init()``, the message queue will be connected and if it succeeds, the Promise it returned will be resolved and the controllers that users build will be loaded and used as the middleware by the Express App. Finally when the ``start()``method is called, the Express App will listen to the given port, and the server starts. The port is default to ``3000`` and the amqpAddress is default to ``amqp://localhost:5672``.