.. _setup_rancher:

Set Up Rancher
==================

If you haven't :ref:`setup_aws` yet, do that first.

Login to Rancher
-------------------------------------

SSH into the Rancher EC2 instance and start the docker container for Rancher. Replace the capitalized parts of the following command with the information for the rancher database created earlier.

  .. code-block:: bash

    sudo docker run -d --restart=unless-stopped --name=rancher -p 8080:8080 rancher/server --db-host DB_URL --db-port 3306 --db-user DB_USER --db-pass DB_PASSWORD --db-name DB_NAME

You should now be able to connect to Rancher's web interface by going to the EC2 URL at port 8080.

Add a Password
-------------------------------------

Go to Admin > Access Control and set up an access control type of your choice.

Add a host
-------------------------------------

Go to Infrastructure > Hosts > Add Host. Use the public IP of the current Rancher EC2 instance for the public IP of the host and run the command given in the SSH connection already open.

Set Variables
-------------------------------------

The ".env" file in the root directory of Pushkin is used to house the configuration of a myriad of docker settings. Open it in a plain text editor and enter in the corresponding information for each line.

Create a new stack
-------------------------------------

  Go to Stacks > New Stack in the Rancher web UI and upload the docker-compose file generated for you (called "docker-compose.production.noEnvDependency.yml" by default). If this doesn't exist, make sure you've made a quiz (:ref:`new-quiz`) and done the initial deployment steps (:ref:`initial-deployment`).

