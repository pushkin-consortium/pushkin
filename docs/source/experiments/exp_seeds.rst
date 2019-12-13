.. _exp_seeds:

Experiment Seeds
=================
Pushkin uses `knex <https://knexjs.org>`_ to facilitate moving data into an experiment's tables in a database. Files inside the seeds directory are seed files containing the data to be moved and directions on where to put it. Each experiment's seed files should align with the strucutre defined in its migration files. The CLI handles the execution of these files.
