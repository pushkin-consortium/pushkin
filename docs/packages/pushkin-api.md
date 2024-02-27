# pushkin-api

## API Controller Builder

The controller builder is what most users will likely want to use for their experiment. It eases the creation of controllers that can be attached to a core Pushkin API. You can find the relevant file in `/experiments/<experiment_name>/api controllers/src`. Below is a simple example of how to use the controller builder:

```js
import pushkin from 'pushkin-api';
const myController = new pushkin.ControllerBuilder();

const db_read_queue = 'myexp_quiz_dbread';
const db_write_queue = 'myexp_quiz_dbwrite';
const task_queue = 'myexp_quiz_taskworker';

myController.setDefaultPasses(db_read_queue, db_write_queue, task_queue);
myController.setDirectUse('/status', (req, res, next) => res.send('up'), 'get');
myController.setPass('/forum/posts', 'getAllForumPosts', db_read_queue, 'get');
myController.setPass('/forum/posts/:postid', 'getForumPost', db_read_queue, 'get');

module.exports = myController;
```

The first line imports the API and the second creates a controller builder. The queues refer to specific queues to send information on through RabbitMQ. Using separate queues allows general categorization of data. For example, in the case of a crash, the write queue is backed up so as to avoid loss of research data during times of high traffic. The controller must be exported when done being modified so it can be required by the core API.

The API layer of a Pushkin project has two main jobs. The first job is taking the request sent from the client, and the second job is sending the request to the message queue. Developers don't need to implement too many details about their experiments' logic in the API layer. All they need to do is design the endpoints and assign the message queues. For this, pushkin-api provides some methods to simplify the developer's job.

For example, developers can use the `setPass()` method to assign HTTP requests to message queues by giving some simple arguments. They can also use `setDirectUse()` if there is no need to use the rpc and message queue in their controller design. Pushkin also provides the method `setDefaultPasses()` to provide a typical controller design of experiments, which only need some message queue arguments.

### setPass

**Arguments:**

* **route:** string

  The API endpoint that this pass applies to.

* **rpcMethod:** string

  What method to request the worker to perform.

* **queue:** string

  The RabbitMQ queue via which to send this pass.

* **httpMethod:** string

  The http method this endpoint will listen on.

**Returns:** None

When an `httpmethod` is sent to `/api/myexp/controllermountpath/route`, send an RPC call of `rpcMethod` through `queue` to a worker listening on the backend. This makes it easy for worker methods to be mapped to API endpoint URLS. When attached to a core API, this controller endpoint returns the data sent back by the worker to the client.

### setDefaultPasses

**Arguments:**

* **read queue:** string

  Name of RabbitMQ read queue to use. Not persistent.

* **write queue:** string

  Name of RabbitMQ write queue to use. Persistent.

* **task queue:** string

  Name of RabbitMQ task queue to use. Not persistent.

**Returns:** None

Enable the default endpoints that a simple experiment would use. This makes it possible to use the default Pushkin Client calls. The default endpoints are:

* `'/startExperiment', 'startExperiment', taskQueue, 'post'`
* `'/getStimuli', 'getStimuli', readQueue, 'post'`
* `'/metaResponse', 'insertMetaResponse', writeQueue, 'post'`
* `'/stimulusResponse', 'insertStimulusResponse', writeQueue, 'post'`
* `'/endExperiment', 'endExperiment', taskQueue, 'post'`

### setDirectUse

**Arguments:**

* **route:** string

  The API endpoint that this use applies to.

* **handler:** function

  Function to call when this endpoint is hit.

* **httpMethod:** string

  The http method this endpoint will listen on.

**Returns:** None

Applies this function to an API endpoint. The handler function is directly attached to an Express Router and should therefore take three arguments for the request, response, and next paramaters respectively.

### getConnFunction

**Arguments:** None

**Returns:** A function that takes a connection obj as the argument and will return a router/controller. This is the API of pushkin to handle the request to the current endpoint. The returned router/controller will be used as the `callback` argument of the `app.use([path,] callback [, callback...])`

Use this method to get the function and take a message queue connection as the argument. Then you can get the returned controller, which can be used as the argument of the  Core API's [`useController`](#usecontroller) method. This method is usually used in the Core-API's [`usePushkinController`](#usepushkincontroller) method. When it gets the Pushkin controller, call this function with a message queue connection to finally get the Express router/controller.

## Core API

The Core API provides some methods which Pushkin can use to load the users's controllers. It will initilize the controllers and the connections with message queues, set up multiple middlewares, and start the server. The Core API of Pushkin works like this (see `/pushkin/api/src/index.js`):

```javascript
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
```

The first line imports the API and the following three create an api. After executing `api.init()`, the message queue will be connected. If the promise returned by `api.init()` is resolved, the controllers that users build will be loaded and used as the middleware by the Express App. Finally, when the `start()` method is called, the Express App will listen to the given port, and the server will start. The port defaults to `3000` and the `amqpAddress` defaults to `amqp://localhost:5672`.

The core API's main jobs are taking the controllers built by the developer, using them in Express App, and starting the server. When developers finish designing their controllers, they can require the controllers as modules and use the `usePushkinController()` method to actually use the controllers in their server. Pushkin handles packaging the custom experiments.

### init

**Arguments:** None

**Returns:** Promise, in which the connection to message queue is built. Once the connection succeeds, the Promise will be resolved and developers can define what to do next.

### useController

**Arguments:**

* **route:** string

  The API endpoint that this use applies to.

* **controller:** express.router

  The middleware function that can be used by Express App to handle the HTTP request.

**Returns:** None

An encapsulated method of Express `app.use(route, controller)`. Use it to add a controller/request handling method to a certain endpoint.

### usePushkinController

**Arguments:**

* **route:** string

  The API endpoint that this use applies to.

* **pushkinController:** ControllerBuilder

  The controller created by users using Controller Builder. After users build their custom controllers in their experiments, pushkin-cli will package them up during the `pushkin prep` command.

**Returns:** None

  Pushkin will package the experiment controllers that users develop and move them to `/pushkin/api`. With this method, Pushkin API will nest the Express router app for this experiment at the route `/api/<exp>`, where `<exp>` is the path for the experiment in question.

### start

**Arguments:** None

**Returns:** None

Start the server and listen to the given port.
