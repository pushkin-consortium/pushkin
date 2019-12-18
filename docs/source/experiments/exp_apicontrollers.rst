.. _exp_api:

The API provides an intermediary between the code running in the subject's browser and the Pushkin backend server (database, workers, etc.). 

A standard Pushkin site will have a folder ``/api/``, which consists of a Docker container, which holds a node program. Out of the box, the ``package.json`` is quite simple:

.. code-block:: JSON

	{
	  "name": "my-pushkin-api",
	  "version": "1.0.0",
	  "description": "An API for Pushkin",
	  "main": "build/index.js",
	  "scripts": {
	    "test": "echo \"Error: no test specified\" && exit 1",
	    "build": "rm -rf build/* && babel src -d build && cp src/controllers.json build/",
	    "start": "node build/index.js"
	  },
	  "author": "",
	  "license": "MIT",
	  "dependencies": {
	    "pushkin-api": "0.0.16"
	  },
	  "devDependencies": {
	    "@babel/cli": "^7.2.3",
	    "@babel/core": "^7.2.2",
	    "@babel/preset-env": "^7.3.1"
	  }
	}

The only important dependency is ``pushkin-api`` (pushkin_api_), which comes with some convenience classes and functions that makes extending the API for a new experiment staightforward. For clarity, we will call the node program contained in ``/api/`` that depends on ``pushkin-api`` the "core API". If there aren't any experiments, the core API doesn't do much. See the out-of-the-box ``/api/src/index.js``:

.. code-block:: javascript

	import pushkin from 'pushkin-api';
	import fs from 'fs';
	import path from 'path';

	const port = process.env.PORT || 3000;
	const amqpAddress = process.env.AMQP_ADDRESS || 'amqp://localhost:5672';

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

By using the pushkin-api helper functions, this code starts an Express router app. For each experiment in ``/api/src/controllers.json``, it nests a router at /api/[exp], where [exp] is the path for the experiment in question as defined in ``/api/src/controllers.json``. Thus, the URL ``/api/myexp/startExperiment`` will be handled by the API for ``myexp``, serving whatever that API returns for ``/startExperiment``. 

Experiment-specific API code
============================
Each experiment should have an ``/api controllers`` folder that contains the Express app for that experiment. Again, this is simplified by making use of convenience functions provided by ``pushkin-api``. The critical code is in ``/api controllers/src/index.js``:

.. code-block:: javascript

	import pushkin from 'pushkin-api';

	const db_read_queue = 'myexp_quiz_dbread'; // simple endpoints
	const db_write_queue = 'myexp_quiz_dbwrite'; // simple save endpoints (durable/persistent)
	const task_queue = 'myexp_quiz_taskworker'; // for stuff that might need preprocessing

	const myController = new pushkin.ControllerBuilder();
	myController.setDefaultPasses(db_read_queue, db_write_queue, task_queue);
	myController.setDirectUse('/status', (req, res, next) => res.send('up'), 'get'); // eslint-disable-line

	module.exports = myController;

This code makes use of the Pushkin controller builder, which allows you to put together an Express app backend with minimal code. Because all experiments (presumably) read and write from databases and send tasks to a worker, these endpoints are already set by default. For those interested in the details, these are defined in ``pushkin-api/src/ControllerBuilder.js``:

.. code-block:: javascript

	setDefaultPasses(readQueue, writeQueue, taskQueue) {
		this.setPass('/startExperiment', 'startExperiment', taskQueue, 'post');
		this.setPass('/getStimuli', 'getStimuli', readQueue, 'post');
		this.setPass('/metaResponse', 'insertMetaResponse', writeQueue, 'post');
		this.setPass('/stimulusResponse', 'insertStimulusResponse', writeQueue, 'post');
		this.setPass('/endExperiment', 'endExperiment', taskQueue, 'post');
	}

To use these, all you need to do is set the names of the queues: 

.. code-block:: javascript

	myController.setDefaultPasses(db_read_queue, db_write_queue, task_queue);

Additional endpoints can be defined. In the example above, we have added an endpoint at ``/status``.

pushkin-api
=====================================
For more information on the ``pushkin-api`` package and available functions, see pushkin_api_.

