.. _gettingstarted:

Quickstart
================

Creating a basic new Pushkin site
----------------------
All instructions are for working on a Mac. If you figure out how to install Pushkin on Windows, please update the documentation and submit a pull request!

If you don't have `Homebrew <https://brew.sh/>`_, install it. Then run the following:

.. code-block:: bash
  
  $ brew install Node

Install the pushkin-cli package globally.

.. code-block:: bash

  $ npm install -g pushkin-cli

Confirm that pushkin-cli is installed by running

.. code-block:: bash

  $ pushkin --help

You should get a list of commands with some documentation for each. We'll be going through the critical ones below. 

Next, install `Docker`_.

Make sure Docker is running. 

Then, open a terminal and move to an empty directory in which to setup Pushkin.

.. code-block:: bash

  $ pushkin install site

You will be asked to select a site template to use. Choose 'default'.

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

  $ pushkin install experiment

Choose a 'basic' experiment. When prompted, name your experiment 'Vocab'. Repeat the process to add 'basic' experiments called 'Mind' and 'WhichEnglish' as well.

This will create a new folder in the experiments directory like

::

   └── vocab
       ├── api controllers
       ├── config.yaml
       ├── migrations
       ├── seeds
       ├── web page
       └── worker
   └── mind
       ├── api controllers
       ├── config.yaml
       ├── migrations
       ├── seeds
       ├── web page
       └── worker
   └── whichenglish
       ├── api controllers
       ├── config.yaml
       ├── migrations
       ├── seeds
       ├── web page
       └── worker

Each folder in here contains something unique to each experiment.
There’s also a configuration file that allows us to define a full name
for the experiment and specify what database to use, among other things.

Keeping all the files for an experiment within the same root folder is convenient for 
development, but not for actually deploying the website. To redistribute the experiment
files to the right places, run:

.. code-block:: bash

  $ pushkin prep

Setting up logins
--------

In ``config.js``, located at ./pushkin/front-end/src, set ``useAuth`` to ``true`` or ``false`` depending on whether you want to have a login system or not. Note that you cannot use a forum without a login system: 

.. code-block:: javascript

  useForum: false,
  useAuth: false, 
  //Note that the forum won't work without authentication

By default, Pushkin authenticates users using `Auth0 <http://auth0.com>`_. This provides many features and better security than could be managed otherwise. It is free for open source projects (contact sales@auth0.com); otherwise it can be fairly pricey if you are hoping for a lot of users. To set up Auth0, use the following directions. (Note that at some point, Auth0 will change up their website and these instructions may get out of date.)

1. Go to auth0.com and create an Auth0 account. 

2. Go to the *Applications* section of the Auth0 dashboard and click *Create Application*.

3. Give your application and a name. Select *Single Page Web App* as your application type. Click *Create*.

4. Choose the *Settings* tab. In *Allowed Callback URLs*, add ``http://localhost/``. In *Allowed Logout URLs*, add ``http://localhost``.  In *Allowed Web Origins*, also add ``http://localhost``. Click the *Save Changes* button.

Note that these URLs are used for development. When you launch the live version of your website, you will need to add your public URLs. Repeat the instructions above, replacing *http://localhost* with *https://YOUR-WEBSITE*. For instance, for gameswithwords, the urls are ``https://gameswithwords.org`` and ``https://gameswithwords/callback``. 

5. On the settings page, you will see a ``Domain`` (something like ``gameswithwords.auth0.com``) and a ``Client ID``. Edit ``config.js`` to match: 

.. code-block:: javascript

  authDomain: '<YOUR_AUTH0_DOMAIN>',
  authClientID: '<YOUR_AUTH0_CLIENT_ID>',


Local testing
-------

Now, let's look at your website! Make sure Docker is running, and then type

.. code-block:: bash

  $ pushkin start

Now browse to ``http://localhost`` to see the stub website.

When you are done looking at your website, stop it by running: 

.. code-block:: bash

  $ pushkin stop

If you don't do that, the web server will keep running in Docker until you quit Docker or restart. 

Updating
--------

Every time you update code or add an experiment, you'll need to run pushkin prep again:

.. code-block:: bash

  $ docker-compose -f pushkin/docker-compose.dev.yml start test_db
  $ pushkin start

Starting over
--------

The great thing about Docker is that it saves your work. (Read up on Docker to see what I mean.) The bad thing is that it saves your work. Simply editing your code locally may not change what Docker thinks the code is. So if you are updating something but it's not showing up in your website or if you are getting error messages from Docker ... ideally, you should read up on Docker. However, as a fail-safe, run `pushkin kill` to delete all your pushkin-specific code in Docker. Then just run `pushkin prep` again. This will take a while, but should address any Docker-specific problems. If you really need a fresh Docker install, run `pushkin armageddon`, which will completely clean Docker. 

Templates
================

TBI


Deploying to AWS
================

TODO


.. include:: ../links/links.rst
