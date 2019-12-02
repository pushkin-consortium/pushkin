.. _gettingstarted:

Getting Started
================

Initialization
################ 

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


Setting up logins
--------

In ``config.js``, set ``useAuth`` to ``true`` or ``false`` depending on whether you want to have a login system or not. Note that you cannot use a forum without a login system: 

.. code-block:: javascript

  useForum: false,
  useAuth: false, 
  //Note that the forum won't work without authentication

By default, Pushkin authenticates users using `Auth0 <http://auth0.com>`_. This provides many features and better security than could be managed otherwise. It is free for open source projects (contact sales@auth0.com); otherwise it can be fairly pricey if you are hoping for a lot of users. To set up Auth0, use the following directions. (Note that at some point, Auth0 will change up their website and these instructions may get out of date.)

1. Go to auth0.com and create an Auth0 account. 

2. Go to the *Applications* section of the Auth0 dashboard and click *Create Application*.

3. Give your application and a name. Select *Single Page Web App* as your application type. Click *Create*.

4. Choose the *Settings* tab. In *Allowed Callback URLs*, add ``http://localhost:3000/callback``. In *Allowed Logout URLs*, add ``http://localhost:3000/``.  In *Allowed Web Origins*, also add ``http://localhost:3000/``. Click the *Save Changes* button.

Note that these URLs are used for development. When you launch the live verrsion of your website, you will need to add your public URLs. Repeat the instructions above, replacing *http://localhost:3000* with *https://YOUR-WEBSITE*. For instance, for gameswithwords, the urls are ``https://gameswithwords.org`` and ``https://gameswithwords/callback``. 

5. On the setings page, you will see a ``Domain`` (something like ``gameswithwords.auth0.com``) and a ``Client ID``. Edit ``config.js`` to match: 

.. code-block:: javascript

  authDomain: '<YOUR_AUTH0_DOMAIN>',
  authClientID: '<YOUR_AUTH0_CLIENT_ID>',


Local testing
-------

.. code-block:: bash

  $ docker-compose -f pushkin/docker-compose.dev.yml up --build

Now browse to ``http://localhost`` to see the stub website.

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

Experiment Stubs
###############

FUBAR

Deploying to AWS
###############

FUBAR


.. include:: ../links/links.rst