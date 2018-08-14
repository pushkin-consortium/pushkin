.. _new-quiz:

Creating a Quiz
================

.. _note: Before preceding, make sure you've followed the instructions to :ref:`setup_aws`.

Creating quizzes on Pushkin is straightforward. Start in the root of the Pushkin directory and follow the below steps.

Make and setup the basics of a quiz by running the following commands.

  pushkin make [quiz name]

There is now a new folder in quizzes/quizzes called [quiz name]. Inside the db_migrations folder are files detailing the default database structure. The db_seeds folder contains initial data to insert into the database. Modify either of these to best fit your quiz, or leave them alone to be dealt with later. Once you're satisfied with them, run ``pushkin prep`` to update the files and then ``pushkin migrate`` and ``pushkin seed`` to connect to the main database with connection information in ``pushkin_env_file``.

Next, run the following commands to build the docker containers and create a finalized version of the docker compose file that contains your new quiz. See :ref:`pushkin_cli` to learn more about these commands.

  pushkin build all
  pushkin make compose
