.. _quiz:

Add a Quiz
===========

To add a quiz, run ``pushkin experiment basic yourQuizName``. This will create a pushkin experiment template experiment in the ``experiments/`` folder.

Open the ``config.js`` located in your experiment folder, modify the experiment name, shortName, logo, text etc.

.. code-block:: yaml

  experimentName: &fullName 'mind Experiment'
  shortName: &shortName 'mind' # This should be unique as its used for urls, etc.
  apiControllers: # The default export from each of these locations will be attached to a pushkin API
    - mountPath: *shortName
      location: 'api controllers'
      name: 'mycontroller'
  worker:
    location: 'worker'
    service: # what to add as a service in main compose file
      image: *shortName
      links:
        - message-queue
        - test_db
      environment:
        - "AMQP_ADDRESS=amqp://message-queue:5672"
        - "DB_USER=postgres"
        - "DB_PASS="
        - "DB_URL=test_db"
        - "DB_NAME=test_db"
  webPage:
    location: 'web page'
  migrations:
    location: 'migrations'
  seeds:
    location: ''
  # Used for migration and seed commands via main CLI
  # Note that these might be different than those given to the worker,
  # Since it's running inside a linked docker container
  database: 'localtestdb'
  logo: 'Mind.png'
  text: 'Enter your experiment description here'
  tagline: 'Be a citizen scientist! Try this quiz.'
  duration: ''

After running ``pushkin prep``, the ``experiments.js`` located in ``pushkin/front-end/src`` will be updated, it should be an array of objects like this:

.. code-block:: javascript

  export default [
    { fullName: 'vocab Experiment', shortName: 'vocab', module: pushkinComponent7e170301859545dab691a08652b798a8, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
    { fullName: 'mind Experiment', shortName: 'mind', module: pushkinComponent1d77ca65c9f94dac834629611d452c8e, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
    { fullName: 'whichenglish Experiment', shortName: 'whichenglish', module: pushkinComponentbbca5356917345c2b2532e84e5325197, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
  ];

Then the new quiz card will be automatically added to the home page.