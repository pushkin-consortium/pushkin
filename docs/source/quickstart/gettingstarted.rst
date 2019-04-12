.. _gettingstarted:

Getting Started
===============

Creating a new Pushkin
----------------------

Make sure you have the below programs installed.

-  `Docker`_
-  `NPM`_
-  Pushkin CLI (can be installed with ``npm install -g pushkin-cli``)

Open a terminal and move to an empty directory in which to setup
Pushkin.

Run ``pushkin init`` to install everything you’ll need in this folder.
Once that finishes, you should have a directory tree that looks
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
with the exception of the website (in the front-end folder). To build
and run Pushkin for the first time, do
``docker-compose -f pushkin/docker-compose.dev.yml up —build``, then
browse to ``http://localhost`` to see it working. It’s pretty empty, so
let’s make an experiment.

Making an Experiment
---------------------

To create a new experiment from the boilerplate template Pushkin
provides, run ``pushkin generate myexp``, replacing “myexp” with a short
name of your experiment. This will create a new folder in the
experiments directory like

::

   └── myexp
       ├── api controllers
       ├── config.yaml
       ├── migrations
       ├── seeds
       ├── web page
       └── worker

Each folder in here contains something unique to this experiments.
There’s also a configuration file that allows us to define a full name
for the experiment and specify what database to use, among other things.

Now we need to bundle the code from each experiment with the core
Pushkin stack, which means moving all the files to their appropriate
places in the main pushkin folder and including them in various modules.
Pushkin has a command to help with this, so run ``pushkin prep``.

Setting up a Database
-----------------------

Now Pushkin is ready to go, but we have to make sure the database we’re
using to collect and serve data is setup as well. If your database is
already up and running elsewhere, you’ll need to tell Pushkin about this
database. Alternatively, you can use the testing database that comes
with Pushkin for now.

Adding a Database
~~~~~~~~~~~~~~~~~

Open ``pushkin.yaml`` in the root of your Pushkin project. Under the
databases key, you’ll see there’s already one entry for the testing
database. It should look something like this:

.. code:: yaml

   databases:
     localtestdb:
       user: 'postgres'
       pass: ''
       url: 'localhost'
       name: 'test_db'

To add a new database, simply add a new key with the same fields and
your connection data. For example:

.. code:: yaml

   databases:
     localtestdb:
       user: 'postgres'
       pass: ''
       url: 'localhost'
       name: 'test_db'
     myotherdb:
       user: 'myusername'
       pass: 'supersecretpassword'
       url: 'databaseserver.mydomain.com'
       name: 'experimentsdatabase'

(*It’s highly recommended that, when deploying any code, you refrain
from typing in real passwords as plain text in the config file. Instead,
use variables, which are supported by YAML.*)

Now open ``config.yaml`` for your experiment and replace the database
line with the name of the database you entered into the main file. The
end of ``experiments/myexp/config.yaml`` would now be

.. code:: yaml

   ...above code...
   database: 'myotherdb'

There’s no limit to the number of experiments that can use the same
database.

Starting the Local Database
~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you’re not using an external database, you can use the one that comes
bundled with Pushkin for development purposes. To start it, run
``docker-compose -f pushkin/docker-compose.dev.yml start test_db``.

Liftoff
-------

Now that our database is up, we can run ``pushkin setupdb`` to
initialize them with the migrations and seeds for each experiment. If
you’re using the local database, turn it off before continuing with
``docker-compose -f pushkin/docker-compose.dev.yml stop test_db``.

Everything’s now ready to be started with
``docker-compose -f pushkin/docker-compose.dev.yml up —build``. browse
to the experiments page to see our new experiment included. The
``--build`` appendix is necessary because we changed some things when we
made the experiment and linked it to the main code. If nothing changed
and you simply want to restart, it can be ommited.

That’s the basics for setting up and making an experiment with Pushkin.
The next steps are to change the default files with your own experiment
design!

.. include:: ../links/links.rst
