.. _local_deploy_pushkin:

Deploying Pushkin Locally
================

Once you've gone through the process of creating a quiz, you can proceed to locally deploy Pushkin, in order to freely develop and test quizzes and other site features. 

First, run ``docker-compose -f docker-compose.production.noEnvDependency.yml up`` to start Pushkin locally, replacing the name of your compose file with whatever it's called if it was changed from the default. 

Now, we need to seed the database for any quizzes which we wish to test or develop. Run ``docker ps`` and find the name of the DB worker container, which is 'db-worker_1' by default.::

    CONTAINER ID        IMAGE                          COMMAND                  CREATED             STATUS              PORTS             NAMES
    be3c744c9a81        pushkin_db-worker        "bash start.debug.sh"    23 hours ago        Up 23 hours                           pushkin_db-worker_1

Now, copy that container ID in full, then run ``docker exec -it [container ID] bash`` to get a shell inside the DB worker Docker container. Type ``npm run migrations`` to run the migrations, then node seeder.js [Name of your quizzes] and ``exit`` to return to your normal shell once seeding is finished.

We're almost done. The last step is to find your server container. Run ``docker ps`` again, and this time look for the server container.::


    CONTAINER ID        IMAGE                          COMMAND                  CREATED             STATUS              PORTS             NAMES
    1744091332f1        pushkin_server           "nginx -g 'daemon ..."   24 hours ago        Up 7 seconds        0.0.0.0:54328->80/tcp   pushkin_server_1

This time, we're most interested in the port. Select the port which points to 80/tcp. In this example, this is port ``54328``. You may now open a browser, and enter ``http://localhost:[Port Number]`` to access the local deployment of Pushkin.

All done! The quiz has been made, its assigned database tables properly seeded, and the Pushkin platform is up and running. 

For more information on the key parts of a Pushkin quiz, see :ref:`foundational_quiz_components`.
