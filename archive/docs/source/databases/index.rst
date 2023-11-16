.. databases:

Local Databases for Testing
-----------------------

The Pushkin CLI command ``pushkin init`` automatically creates a Postgres database for testing (``test_db``). If needed, you can create additional databases for local testing.

Adding local database to Docker-Compose
========================

First, you will need to add the database service to ``docker-compose.dev.yml``. Here, we have added a second database in addition to ``test_db``:

.. code:: yaml

  test_db:
    image: 'postgres:11'
    ports:
      - '5432:5432'
    volumes:
      - 'test_db_volume:/var/lib/postgresql/data'
  second_db:
    image: 'postgres:11'
    ports:
      - '5432:5432'
    volumes:
      - 'second_db_volume:/var/lib/postgresql/data'

Here, this is another standard Postgres database using the public image ``postgres:11``. The port settings are also adjusted. We've chosen to put the two databases on different volumes. For more information on docker volumes, see here: Docker_volumes_ . For general information on docker-compose files, see: Docker_Compose_ .

Now launch this image:

.. code:: bash
  > docker-compose -f pushkin/docker-compose.dev.yml up MYDB
  > docker-compose -f pushkin/docker-compose.dev.yml start MYDB


Setting up the database
=======================

So far, we've set up a database service. We don't have an actual database. Assuming your image is up and running (see previous step), you can set up a database as follows:

.. code:: bash

  > docker-compose -f pushkin/docker-compose.dev.yml exec -T second_db psql -U USER -c "create database MYDB"

Replace ``USER`` with whatever you'd like the username for the database to be. Replace ``MYDB`` with whatever you'd like the name of the database to be. The password defaults to blank. Since this is a local test database, and since actually setting up a password is somewhat complicated, we recommend you stick with that default. 

Adding local database to Pushkin.yaml
=======================

The Pushkin CLI also needs to know about your databases. We list them in the ``pushkin.yaml`` config file. Below, we've added the new database to the bottom.

.. code:: yaml

   databases:
     localtestdb:
       user: 'postgres'
       pass: ''
       url: 'localhost'
       name: 'test_db'
     myotherdb:
       user: 'USER'
       pass: ''
       url: 'localhost'
       name: 'MYDB'

Again, swtich ``USER`` and ``MYDB`` for whatever you actually used. 

Telling your experiments which database to use
=====================

Each experiment has its own ``config.yaml`` for your experiment. Set the database you wish to use:

.. code:: yaml

   ...above code...
   database: 'myotherdb'

Note that you should use the name of the database as defined in ``pushkin.yaml``. Do not use the name of the docker container (``second_db``) or the name of the database on that docker container (``MYDB``).

There’s no limit to the number of experiments that can use the same database.

Remote Databases for Production
----------------------

TODO

.. include:: ../links/links.rst