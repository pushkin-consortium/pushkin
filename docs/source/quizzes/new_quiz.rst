.. _new-quiz:

Creating a Quiz
================

.. _note: Before preceding, make sure you've followed the instructions to :ref:`setup_aws`.

Creating quizzes on Pushkin is straightforward. Start in the root of the Pushkin directory and follow the below steps.


Make and setup the basics of a quiz by running the following commands.
*Take Note: If you did not set a Pushkin alias, then you would use the following command, **./.pushkin/pushkin.sh**,  in place of pushkin, which calls the pushkin.sh script from its source in root.*::

  pushkin make [quiz name]
  pushki prep
  pushkin build all
  pushkin make compose

In order of the commands, this generates quiz files, moves them to their various locations inside Pushkin, rebuilds the docker containers, and creates a finalized docker compose file. See :ref:`pushkin_cli` to learn more about these commands.

.. todo: Seeding the database is still not very user-friendly; a seeder file that uses knex.js and knows the structure of the table in the database must be created, along with a corresponding CSV file with the actual data. Either instructions for creating these should be writting or we create a template to include whenever a new quiz is created with ``pushkin make quiz``.

Now, we need to run the migrations for the quiz, which will setup the database with the appropriate tables. First, run ``docker-compose -f docker-compose.production.noEnvDependency.yml up`` to start Pushkin locally, replacing the name of your compose file with whatever it's called if it was changed from the default. Then run ``docker ps`` and find the name of the DB worker, probably called something like 'db-worker-1'.

Next, run ``docker exec -it [container name] bash`` to get a shell inside the DB worker Docker container. Type ``npm run migrations`` to run the migrations and ``exit`` to return to your normal shell once they've finished.

All done! The quiz has been made and the appropriate database space has been allocated to it. It's now ready to collect data.

For more information on the key parts of a Pushkin quiz, see :ref:`foundational_quiz_components`.
