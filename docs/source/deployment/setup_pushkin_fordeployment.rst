.. _setup_pushkin_fordeployment:

Preparing Pushkin to Deploy
##################


Depending on how you've set up Pushkin and your experiments, some of the database credentials may have to be changed. If your experiments are using the local testing database, make sure to change connection information in the experiments' ``config.yaml`` files.

You'll also likely want to add a new database in the main ``pushkin.yaml`` file. This will let you setup the database for your experiment with the CLI command. See :ref:`adding_a_database` in the getting started guide for reference.
