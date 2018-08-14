.. _new-quiz:

Creating a Quiz
================

.. _note: Before preceding, make sure you've followed the instructions to :ref:`setup_aws`.

Creating quizzes on Pushkin is straightforward. Start in the root of the Pushkin directory and follow the below steps.


Make and setup the basics of a quiz by running the following commands.

  pushkin make [quiz name]
  pushki prep
  pushkin build all
  pushkin make compose

In order of the commands, this generates quiz files, moves them to their various locations inside Pushkin, rebuilds the docker containers, and creates a finalized docker compose file. See :ref:`pushkin_cli` to learn more about these commands.

.. todo: Seeding the database is still not very user-friendly; a seeder file that uses knex.js and knows the structure of the table in the database must be created, along with a corresponding CSV file with the actual data. Either instructions for creating these should be writting or we create a template to include whenever a new quiz is created with ``pushkin make quiz``.

