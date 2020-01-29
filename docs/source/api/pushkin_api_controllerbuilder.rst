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
