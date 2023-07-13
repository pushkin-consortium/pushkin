# Worker Component, Migration, and Seed

## Experiment Worker Component

Workers handle the most complex aspect of a Pushkin experiment and different types of experiments could need workers with very different functionalities. Pushkin provides a simple template written in Javascript to start with.

The job of a worker is to receive messages via RabbitMQ that \(usually\) come from an API controller. It looks up the appropriate information in the database and returns it to the requester. Workers are also the component that is responsible for implementing machine learning, as having direct access to this data allows it to make live, dynamic decisions during an experiment like what stimuli to serve next or predictions about a subject’s next answers.

## Experiment Migrations

Pushkin uses [knex](https://knexjs.org/) to manage database tables. Files inside the migrations directory are migration files that describe how to set up and take down the tables needed for an experiment. The CLI handles the details of connecting to and executing the appropriate order of commands required to set up all experiment’s tables. Once the table structure has been created, [seeding](https://pushkin-social-science-at-scale.readthedocs.io/en/latest/experiments/exp_seeds.html#exp-seeds) is used to populate the database with experiment data, such as stimuli.

When making a new experiment with new migrations, it is helpful to prefix the filenames with numbers in order to get the order right \(you want tables that are going to be referenced by other tables to be created first, so giving them an alphabetically earlier filename is helpful\).

## Experiment Seeds

Pushkin uses [knex](https://knexjs.org/) to facilitate moving data into an experiment’s tables in a database. Files inside the seeds directory are seed files containing the data to be moved and directions on where to put it. Each experiment’s seed files should align with the structure defined in its migration files. The CLI handles the execution of these files.

