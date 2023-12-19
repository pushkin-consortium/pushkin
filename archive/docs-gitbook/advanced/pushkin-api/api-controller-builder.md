# API Controller Builder

The controller builder is what most users will likely want to use for their experiment. It eases the creation of controllers that can be attached to a core Pushkin API. Below is a simple example of how to use it:

```javascript
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

The API layer of a Pushkin project has two main jobs. The first job is taking the Request sent from the client, and the second job is sending the request to the message queue. So developers don’t need to implement too many details about their experiments logics in API layer. All they need to do are designing the endpoints and assigning the message queues. So Pushkin-API provides some useful methods, which will simplify the operation of the developer’s job.

For example, developers can use `setPass()` method to assign which HTTP request to which message queue by giving some simple arguments. They can also use `setDirectUse()` if there is no need to use the rpc and message queue in their controller design. Pushkin also provides a quite useful method `setDefaultPasses()` to provide a typical controller design of experiments, which only need some message queue arguments.

## setPass

**Arguments:**

* **route** : string

  The API endpoint that this pass applies to.

* **rpcMethod** : string

  What method to request the worker to perform.

* **queue** : string

  The RabbitMQ queue via which to send this pass.

* **httpMethod** : string

  The http method this endpoint will listen on.

**Returns:** None

When an `httpmethod` is send to `/api/myexp/controllermountpath/route`, send an RPC call of `rpcMethod` through `queue` to a worker listening on the backend. This makes is easy for worker methods to be mapped to API endpoint URLS. When attached to a core API, this controller endpoint returns the data sent back by the worker to the client.

## setDefaultPasses

**Arguments:**

* **read queue** : string

  Name of RabbitMQ read queue to use. Not persistent.

* **write queue** : string

  Name of RabbitMQ write queue to use. Persistent.

* **task queue** : string

  Name of RabbitMQ task queue to use. Not persistent.

**Returns:** None

Enable the default endpoints a simple experiment would use. This makes it possible to use the default Pushkin Client calls. The default endpoints are

> * ‘/startExperiment’, ‘startExperiment’, taskQueue, ‘post’
> * ‘/getStimuli’, ‘getStimuli’, readQueue, ‘post’
> * ‘/metaResponse’, ‘insertMetaResponse’, writeQueue, ‘post’
> * ‘/stimulusResponse’, ‘insertStimulusResponse’, writeQueue, ‘post’
> * ‘/endExperiment’, ‘endExperiment’, taskQueue, ‘post’

## setDirectUse

**Arguments:**

* **route** : string

  The API endpoint that this use applies to.

* **handler** : function

  Function to call when this endpoint is hit.

* **httpMethod** : string

  The http method this endpoint will listen on.

**Returns:** None

Applies this function to an API endpoint. The handler function is directly attached to an Express Router and should therefore take three arguments for the request, response, and next paramaters respectively.

## getConnFunction

**Arguments:** None

**Returns:** A function that takes a connection obj as the argument and will return a router/controller. This is the API of pushkin to handle the request to the current endpoint. The returned router/controller will be used as the `callback` argument of the `app.use([path,] callback [, callback...])`

Use this methods to get the function and take a message queue connection as the argument, then you can get the returned controller, which can be used as the argument of `useController` method in\`\`Core API\`\` section. This method is usually used in Core-API part, `usePushkinController` method. When it gets the Pushkin controller, call this function with a message queue connection to finally get the Express router/controller.

