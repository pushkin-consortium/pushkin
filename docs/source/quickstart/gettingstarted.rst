.. _gettingstarted:

Getting Started
===============

Creating a basic new Pushkin site
----------------------

Make sure you have the below programs installed.

-  `Docker`_
-  `NPM`_
-  Pushkin CLI (can be installed with ``npm install -g pushkin-cli``)

Open a terminal and move to an empty directory in which to setup
Pushkin.

Make sure Docker is up and running, then run:

.. code-block:: bash

  $ pushkin init

This sets up a skeleton website in the current folder and sets up a development database. Once that finishes, you should have a directory tree that looks
something like this:

::

   ├── experiments
   ├── pushkin
      ├── api
      ├── docker-compose.dev.yml
      ├── front-end
      └── util
   └── pushkin.yaml

Most of the stuff in the pushkin folder won’t need to be edited at all,
with the exception of the website (in the front-end folder). 

Making an Experiment
---------------------

To create a new experiment from the boilerplate template Pushkin
provides, run

.. code-block:: bash

  $ pushkin generate myexp

replacing “myexp” with a short name of your experiment. This will create a new folder in the
experiments directory like

::

   └── myexp
       ├── api controllers
       ├── config.yaml
       ├── migrations
       ├── seeds
       ├── web page
       └── worker

Each folder in here contains something unique to this experiment.
There’s also a configuration file that allows us to define a full name
for the experiment and specify what database to use, among other things.

Keeping all the files for an experiment within the same root folder is convenient for 
development, but not for actually deploying the website. To redistribute the experiment
files to the right places, run:

.. code-block:: bash

  $ pushkin prep


Setting up a local database
-----------------------

For now, let's use the test database that is built by ``pushkin init``. We need to populate it
with stimuli for our experiment(s):

.. code-block:: bash

  $ docker-compose -f pushkin/docker-compose.dev.yml start test_db
  $ pushkin setupdb
  $ docker-compose -f pushkin/docker-compose.dev.yml stop test_db

Local testing
-------

.. code-block:: bash

  $ docker-compose -f pushkin/docker-compose.dev.yml up --build

Now browse to ``http://localhost`` to see the stub website.

Deploying to AWS
---------

Deploying to AWS is much more complicated <deploying>


Updating
--------

If you make updates to your website, here is how to re-launch a local test version:

.. code-block:: bash

  $ docker-compose -f pushkin/docker-compose.dev.yml stop
  $ pushkin prep
  $ docker-compose -f pushkin/docker-compose.dev.yml start test_db
  $ pushkin setupdb
  $ docker-compose -f pushkin/docker-compose.dev.yml stop test_db
  $ docker-compose -f pushkin/docker-compose.dev.yml up --build  


.. include:: ../links/links.rst
