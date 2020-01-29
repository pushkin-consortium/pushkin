.. _pushkin_api_controllerbuilder:

API Controller Builder
========================
The controller builder is what most users will likely want to use for their experiment. It eases the creation of controllers that can be attached to a core Pushkin API. Below is a simple example of how to use it::

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

The first line imports the API and the second creates a controller builder. The queues refer to specific queues to send information on through RabbitMQ. Using separate queues allows general categorization of data. For example, in the case of a crash, the write queue is backed up so as to avoid loss of research data during times of high traffic. The controller must be exported when done being modified so it can be required by the core API.

setPass
----------
**Arguments:**
   - **route** : string

     The API endpoint that this pass applies to.

   - **rpcMethod** : string

     What method to request the worker to perform.

   - **queue** : string

     The RabbitMQ queue via which to send this pass.

   - **httpMethod** : string

     The http method this endpoint will listen on.

**Returns:** None

When an ``httpmethod`` is send to ``/api/myexp/controllermountpath/route``, send an RPC call of ``rpcMethod`` through ``queue`` to a worker listening on the backend. This makes is easy for worker methods to be mapped to API endpoint URLS. When attached to a core API, this controller endpoint returns the data sent back by the worker to the client.

-------------------

setDefaultPasses
------------------
**Arguments:**
   - **read queue** : string

     Name of RabbitMQ read queue to use. Not persistent.

   - **write queue** : string

     Name of RabbitMQ write queue to use. Persistent.

   - **task queue** : string

     Name of RabbitMQ task queue to use. Not persistent.

**Returns:** None

Enable the default endpoints a simple experiment would use. This makes it possible to use the default Pushkin Client calls. The default endpoints are

   - '/startExperiment', 'startExperiment', taskQueue, 'post'
   - '/getStimuli', 'getStimuli', readQueue, 'post'
   - '/metaResponse', 'insertMetaResponse', writeQueue, 'post'
   - '/stimulusResponse', 'insertStimulusResponse', writeQueue, 'post'
   - '/endExperiment', 'endExperiment', taskQueue, 'post'