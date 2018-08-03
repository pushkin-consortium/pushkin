.. _local_deploy_pushkin:

.. _initial-deployment:

Preparing for Deployment
=========================

Once you have installed Pushkin (:ref:`get-pushkin`), made a quiz running locally (:ref:`new-quiz`), and setup AWS (:ref:`setup_aws`) you're ready to deploy to the web.

Run::

  pushkin prep
  pushkin compile
  pushkin build all
  pushkin sync all

to prep, build, and push all files online. This may take a few minutes. Once it's done, run ``pushkin make compose`` to create a Docker compose file without any environment variables that includes your custom quiz workers, suitable for use with Rancher. The file generated will be called 'docker-compose.production.noEnvDependency.yml' by default, or whatever you've set ``pushkin_docker_compose_noDep_file`` to.


Deploying Pushkin Locally
-------------------------

Once you've gone through the process of creating and compiling a quiz, you can proceed to locally deploy Pushkin, in order to freely develop and test quizzes and other site features. 

First, run ``pushkin start`` to start Pushkin locally.

Now, we need to seed the database for any quizzes which we wish to test or develop. Run ``docker ps`` and find the name of the DB worker container, which is 'db-worker_1' by default.

.. code:: bash

    CONTAINER ID        IMAGE               COMMAND                CREATED         STATUS         PORTS             NAMES

    be3c744c9a81        pushkin_db-worker   "bash start.debug.sh"  23 hours ago    Up 23 hours                      pushkin_db-worker_1

Now, copy that container name and run ``docker exec -it [name] bash`` to get a shell inside the DB worker Docker container. Type ``npm run migrations`` to run the migrations, then ``npm run seed`` to populate the database with your seeds. Type ``exit`` to return to your normal shell.

.. caution:: If you have multiple quizzes and have added data to a table in the database that a seed file corresponds to, be aware that seeding removes all data in the table before beginning. Make sure to first delete the files inside the seeds folder of the db-worker container that you don't want to run.

We're almost done. The last step is to find your server container. Run ``docker ps`` again, and this time look for the server container.

.. code:: bash

    CONTAINER ID        IMAGE            COMMAND                CREATED       STATUS         PORTS                   NAMES

    1744091332f1        pushkin_server   "nginx -g 'daemon ..." 24 hours ago  Up 7 seconds   0.0.0.0:54328->80/tcp   pushkin_server_1

This time, we're most interested in the port. Select the port which points to 80/tcp. In this example, this is port ``54328``. You may now open a browser, and enter ``http://localhost:[Port Number]`` to access the local deployment of Pushkin.

All done! The quiz has been made, its assigned database tables properly seeded, and the Pushkin platform is up and running. 

For more information on the key parts of a Pushkin quiz, see :ref:`foundational_quiz_components`.

