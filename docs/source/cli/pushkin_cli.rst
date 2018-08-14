.. _pushkin_cli:

Pushkin CLI
=============

The Pushkin CLI comes packaged in the repo. Setup instructions can be found in :ref:`get-pushkin`.

Variables relating to file structure and naming practices can be found in '.pushkin/pushkin_config_vars.sh'.

Pushkin has the following nested commands:

make
--------

quiz
^^^^^^
Creates a new quiz with all the required basic components. Pass the quiz name as an argument as follows: ``pushkin make quiz [quiz name]``. Spaces and other special characters should be avoid. Note that the name seen by end users of the website can be changed to have special characters if needed by modifying the quizzes page in the front end. Generated quizzes are stored in ``pushkin_user_quizzes``, 'quizzes/quizzes' by default.

compose
^^^^^^^^
Creates the file specified by ``pushkin_docker_compose_noDep_file``, replacing all docker variables set in ``.env`` as well as appending quiz compose files from the quizzes directory. Uses ``pushkin_docker_compose_file`` for the original compose file.


prep
--------

Handles moving files and writing information to the various components of Pushkin infrastructure. This command allows for all quiz-related information to be consolidated in the quizzes folder.

It moves all quiz files from ``pushkin_user_quizzes/[quiz name]`` to their appropriate locations in the api, cron, front end, etc. and generates a quizzes.js (``pushkin_front_end_quizzes_list``) file in the front end.

compile
--------

Compiles the front end using the command specified by ``pushkin_front_end_compile_cmd``.

Moves the compiled files from ``pushkin_front_end_dist`` to ``pushkin_server_html``.

migrate
---------

Connects to the main database specified in ``pushkin_env_file`` and runs knex migrations from the db-worker's directory.

seed
--------

Connects to the main database specified in ``pushkin_env_file`` and runs knex seeds from the db-worker's directory.

build
--------

[core container]
^^^^^^^^^^^^^^^^^
Builds the docker container specified by [core container] where [core container] is one of "api", "cron", "dbworker", or "server".

core
^^^^^^
Builds all the core docker containers.

quizzes
^^^^^^^^
Builds each quiz's worker by looping through the ``pushkin_user_quizzes`` folder, each folder name being used as the quiz name. The tags given each quiz are templated as follows::

  [image_prefix]/[quiz name][pushkin_user_quizzes_docker_suffix]:[image_tag]

where image_prefix and image_tag are specified in the docker '.env' file, ``pushkin_user_quizzes_docker_suffix`` is set in the pushkin config vars, and the quiz name based off the current folder in the quizzes directory.

all
^^^^^^
Does both of the above steps.

sync
--------

coreDockers
^^^^^^^^^^^^
Pushes the api, cron, server, and db worker containers to docker hub.

quizDockers
^^^^^^^^^^^^^
Loops through the ``pushkin_user_quizzes`` folder and uses the same templating as in the ``pushkin build quizzes`` to push each image to docker hub.

website
^^^^^^^^^^^^
Uses the AWS CLI to sync ``pushkin_front_end_dist`` with ``s3_bucket_name``. Note that this means you must have installed and set up the AWS CLI.

all
^^^^^^^^^
Does all of the above steps.

start
----------

A small convenience utility. Runs docker-compose up on ``pushkin_docker_compose_noDep_file``.

init
-----------

Runs ``npm install`` in the api, front-end, and db-worker directories as specified by their variable names in ``pushkin_config_vars.sh``.
