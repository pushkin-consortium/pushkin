.. _pushkin_cli:

Pushkin CLI
=============

Pushkin CLI comes packaged in the repo. Setup instructions can be found `here <_get-pushin>`.

Most variables relating to file structure and naming practices can be found in '.pushkin/pushkin_config_vars.sh'.

Pushkin has the following commands:

make
--------

quiz
^^^^^^

To create a new quiz, run ``pushkin make quiz [quiz name]``.

compose
^^^^^^^^

Creates the file specified by ``pushkin_docker_compose_noDep_file``, replacing all docker variables set in ``.env`` as well as appending quiz compose files from the quizzes directory.


prep
--------

Handles moving files and writing information to the various components of Pushkin infrastructure. This command allows for all quiz-related information to be consolidated in the quizzes folder.

It moves all quiz files from quizzes/quizzes/[quiz name] to their appropriate locations in the api, cron, front end, etc. and generates a quizzes.js file in the front end as specified by ``pushkin_front_end_quizzes_list``.

compile
--------

Compiles the front end using the command specified by ``pushkin_front_end_compile_cmd``.

Moves the compiled files from ``pushkin_front_end_dist`` to ``pushkin_server_html``.

build
--------

core
^^^^^^

Builds the api, cron, server, and db worker containers.

quizzes
^^^^^^^^

Builds each quiz's worker.

all
^^^^^^

Does both the above steps

sync
--------

coreDockers
^^^^^^^^^^^^

quizDockers
^^^^^^^^^^^^^

website
^^^^^^^^^^^^

all
^^^^^^^^^
