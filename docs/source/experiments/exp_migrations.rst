.. _exp_migrations:

Experiment Migrations
=====================
Pushkin uses `knex <https://knexjs.org>`_ to manage database tables. Files inside the migrations directory are migration files that describe how to setup and take down the tables needed for an experiment. The CLI handles the details of connecting to and executing the appropriate order of commands required to setup all experiment's tables. Once the table structure has been created, :ref:`seeding <exp_seeds>` is used to populate the database with experiment data, such as stimuli.

When making a new experiment with new migrations, it is helpful to prefix the filenames with numbers in order to get the order right (you want tables that are going to be referenced by other tables to be created first, so giving them an alphabetically earlier filename is helpful).