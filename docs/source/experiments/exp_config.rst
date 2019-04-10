.. _exp_config:

Experiment Config Files
=======================
The config file provides information to the rest of Pushkin about the experiment. Below is a sample of what one might look like.

::

   experimentName: &fullName 'myexp Experiment'
   shortName: &shortName 'myexp'
   apiControllers:
     - mountPath: *shortName
       location: 'api controllers'
       name: 'mycontroller'
   worker:
     location: 'worker'
     service:
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
     location: 'seeds'
   database: 'localtestdb'
    
Each of the above fields is explained in detail below.

experimentName
---------------
The full name of your experiment. This is used as a display name on the website to users.

shortName
-------------
This is a short, more computer friendly version of you experiment's name. It should be unique as it is used as the folder name in the experiments folder.

apiControllers
---------------

mountPath
~~~~~~~~~~~~

location
~~~~~~~~~~~~

name
~~~~~~~~~~

worker
-----------

...etc...
