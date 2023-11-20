# Core API

The Core API provides some methods which Pushkin can use to load users’s controllers. It will initilize the controllers and the connections with message queues, set up multiple middlewares, and start the server. The Core API of Pushkin works like this:

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

The first line imports the API and the following three create an api. After executing `api.init()`, the message queue will be connected and if it succeeds, the Promise it returned will be resolved and the controllers that users build will be loaded and used as the middleware by the Express App. Finally when the ```start()``method is called, the Express App will listen to the given port, and the server starts. The port is default to ``3000``` and the amqpAddress is default to `amqp://localhost:5672`.

The Core-API part‘s main jobs are taking the controllers the developers build, using it in Express App, and starting the server. The processes are quite standardized. When developers finish their design of controllers, they can require the controllers as modules then use `usePushkinController()` method to actually use the controllers in their server. Pushkin will take charge of packaging the custom experiments.

## init

**Arguments:** None

**Returns:** Promise, in which the connection to message queue is built. Once the connection succeeds, the Promise will be resolved and developers can define what to do next.

## useController

**Arguments:**

* **route** : string

  The API endpoint that this use applies to.

* **controller** : express.router

  The middleware function that can be used by Express App to handle the HTTP request.

**Returns:** None

An encapsulated method of Express app.use\(route, controller\). Use it to add controller/request handling method to certain endpoint.

## usePushkinController

**Arguments:**

* **route** : string

  The API endpoint that this use applies to.

* **pushkinController** : ControllerBuilder

  The controller created by users using Controller Builder. After users build their custom controllers in their experiments, the pushkin will package them under the `pushkin prep` command.

**Returns:** None

The Pushkin will package the experiments that users develop and move it to `./pushkin`. For the API part, the pushkin will load and require the experiment’s controllers. With this method, the Pushkin-API will nest the Express router app for this experiment at the route /api/\[exp\], where \[exp\] is the path for the experiment in question.

## start

**Arguments:** None

**Returns:** None

Start the server and listen to the given port.

