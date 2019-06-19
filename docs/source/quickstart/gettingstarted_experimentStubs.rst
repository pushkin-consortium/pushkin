.. _gettingstarted_experimentStubs:

FUBAR

Experiment API Controllers Component
=====================================
The API (pushkin_api_) provides an intermediary between the code running in the subject's browser and the Pushkin backend server (database, workers, etc.). The API Controllers define a mapping between URLs and worker tasks. The stub experiment for a basic quiz named ``myexp`` will have a controller (``experiments/myexp/api controllers/src/index.js``) that looks like this: 

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

Each of these has default abilities that can be customized as needed. For simple quizzes, this may not be necessary. 

Additional endpoints can be defined. In the example above, we added an additional endpoint ``status``.

For more on how to customize API controllers, see pushkin_api_.

Experiment Worker
=====================================
In addition to an API, each experiment has (at least) one worker. The worker is a program that runs on the server and listens for requests from the API. By default, the worker comes equipped with methods to handle to handle the following five tasks: startExperiment, getStimuli, insertMetaResponse, insertStimulusResponse, and endExperiment. Whether these will actually do what you want for your experiment is another question. For more details, see pushkin_worker_.


.. include:: ../links/links.rst
