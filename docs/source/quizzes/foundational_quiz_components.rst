.. _`foundational_quiz_components`:

Foundational Quiz Components
=============================

Front-end Page
---------------

  Under the folder 'quiz_page', this houses the React component(s) of a Pushkin quiz. When a user visits the quiz page of the website and clicks a link to a quiz, the default export from index.js is loaded and served on a blank canvas to give over full control of the page.

Database Preparation Process
------------------------------

  Before a quiz can be run, and data recorded and stored, the database must contain the appropriate tables, and be seeded with an array of stimuli to present to quiz-takers. This task is handled by files contained in the db-worker folder within root. The first step in the process lies in db-worker/migrations.  

Database Migrations
---------------------

  Under the migrations folder, you will find four timestamped files for each Pushkin quiz. Each migration file serves to define and create the columns of a database table, by specifying the names and valid data types of each column. Each database table deals with a different aspect of quiz data, and does so by returning a knex schema. These are:

* Quiz Stimuli - Lists all of the available questions for a Pushkin quiz.

  Each stimulus entry consists of an ID number, the name of the quiz, the stimulus, answer options, a count of responses to     that stimulus, and the category of question.

.. code:: python

   exports.up = function(knex) {
    return knex.schema.createTable('bloodmagic_stimuli', table => {
      table.increments('id').primary();
      table.string('task');
      table.string('stimulus').unique();
      table.string('options');
      table.integer('num_responses');
      table.string('question_category');
    });
  };
  
* Quiz Users - Lists all of the users who have contributed to that quiz.

.. code:: python

 exports.up = function(knex) {
   return knex.schema.createTable('bloodmagic_users', table => {
     table.increments('id').primary();
     table.string('auth0_id');
     table.timestamp('created_at');
     table.timestamp('updated_at');
   });
 };


* Stimulus Responses - Lists all responses given, with stimulus prompt included.

.. code:: python

 exports.up = function(knex) {
   return knex.schema.createTable('bloodmagic_stimulusResponses', table => {
     table.increments('id').primary();
     table.integer('user_id').references('id').inTable('bloodmagic_users');
     table.string('stimulus').references('stimulus').inTable('bloodmagic_stimuli');
     table.json('data_string');
     table.timestamp('created_at');
     table.timestamp('updated_at');
   });
 };

* Responses - Lists all responses given, without stimulus prompt. 

.. code:: python

 exports.up = function(knex) {
   return knex.schema.createTable('bloodmagic_responses', table => {
     table.increments('id').primary();
     table.integer('user_id').references('id').inTable('bloodmagic_users');
     table.json('data_string');
     table.timestamp('created_at');
     table.timestamp('updated_at');
   });
 };


Database Seeds
---------------

 The next step is a seeder script, which uses a dataset of questions in .csv format to populate the stimuli table for each quiz. The seeder script is identical across quizzes, but care should be taken to ensure that the columns defined in the seed csv match those defined by the appropriate migrations, as in the sample presented below.

Sample .csv for use in seeding:

.. image:: seeds.png


Cron Scripts
---------------

  Cron is a language-agnostic (Meaning that code execution is not limited to a subset of programming languages) service for running programming scripts on a scheduled, periodic basis. In the context of Pushkin, Cron occupies its own docker container, with its own dependencies, and is composed of two main components:

* Crontab

  This is a configuration file which schedules shell commands for execution. Each line of the crontab specifies a single job,   and that job's schedule. 

  These sample tasks are executing python scripts, and saving their output (If any) to .txt files. 
  
  .. code:: python

     # Execute every 5 minutes.
     
       5 * * * * root echo "test" >> /scripts/test.txt 

     # Execute at time 00:00 (midnight) every day.
     
       0 0 * * * root /usr/bin/python2.7  /scripts/test.py >> /scripts/test2.txt 

     # Execute at 10:00 on the first day of every month.
     
       0 10 1 1 * root /usr/bin/python2.7  /scripts/secondTest.py >> /scripts/out.txt 

     # Execute every minute on Monday only.
     
       1 * * * 1 root /usr/bin/python2.7  /scripts/testBoto.py >> /scripts/out2.txt 

  This system of scheduling is powerful and easy-to-use. 
  
  *Note that asterisks are wildcard symbols which can assume any number*
    
.. image:: crontime.png

* Scripts

  The jobs themselves can be written in any programming language, and can perform any required task on schedule. 


* DockerFile

  This file is responsible for establishing the environment of your docker container, installing necessary dependencies and     packages by running shell commands. For example, the following three commands install curl, then pip, then boto3 for python. 

    * RUN apt-get install curl -y
    * RUN curl --silent --show-error --retry 5 https://bootstrap.pypa.io/get-pip.py | python
    * RUN pip install boto3

---------------

These scripts are optional but may be useful for periodically organizing or analyzing data. Docker provides this container access to your database via an enviroment variable called 'DATABASE_URL', which encodes the username and password as set in the '.env' file as well.

API Controller
---------------

The API controller is a script which establishes communication endpoints between the front-end, represented by the quiz and user interface, and the back-end, which consists of the database and associated workers. Each endpoint serves as an interface which allows the frontend to make HTTP requests to the main Pushkin API. These requests pertain to writing or reading data - The path of the request, the name of the method, and the data which is associated with the request, are all defined in the quiz-specific API controller. 

You may wish to add additional methods for reading and writing from the database. To do so, you will have to define an endpoint in API controller, and include the information which you wish to send to the backend. The controller is added to the API and placed into a queue. The quiz-specific db-worker contains a script called handleResponse.js. This scripts listens for HTTP requests sent from the API, and uses the controller to select the appropriate database query, which you will have to define. 

A GET endpoint from a quiz controller:

  .. code:: javascript

  { path: '/questionsAnswered', method: 'questionsAnswered', data: req => ({ user_id: req.query.user_id })},

------

The corresponding method in handleResponse.js (db-worker):

.. code:: python

  # Executes whatever SQL query it is given, using psycopg2 for python. 

  def queryDbMain(sql):
      conn = None
      try:
          conn = dbConnData()
          cur = conn.cursor()
          cur.execute(sql)
          result = cur.fetchall()
          cur.close()
          return result

      except (Exception, psycopg2.DatabaseError) as err:
          print(err)
          return { 'message': 'query error: {}'.format(err) }

      finally:
          if conn is not None:
              conn.close()

  # The SQL query for a method, making use of the data passed by a controller endpoint. 

  def userQuestionResponses(data):
      sql = 'SELECT COUNT(*) FROM "quizName_stimulusResponses" WHERE user_id = {}'.format(data.user_id)
      return queryDbMain(sql)

  # An object which calls the appropriate query for a given method. 

  methods = {
          "questionsAnswered": userQuestionResponses,
          }