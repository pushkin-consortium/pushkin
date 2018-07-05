.. _initial-deployment:

Initial Deployment
===================

Walk through the initial setup of Pushkin infrastructure.

Requirements
----------------

These instructions assume you have:

* a working version of Pushkin
* access to AWS
* a Docker (Hub) account

Setup AWS
---------------

1. Define security groups
^^^^^^^^^^^^^^^^^^^^^^^^^^

  You'll need two security groups — one for rancher and one for the databases.

  The rancher EC2 security group should be open to all traffic on ports

    Port    Protocol
    =====   =========
    80      TCP
    443     TCP
    8080    TCP
    500     UDP
    4500    UDP
      
  This is for normal web access, the rancher management web UI, and the Rancher host infrastructure.

  The database security group should be open to all TCP traffic on ports 3306 (MySQL) and 5432 (Postgres).

  Instructions on creating a security group can be found on AWS.

  .. todo:: Add link for instructions.

2. Get an EC2
^^^^^^^^^^^^^^

  The most straightforward way to do this is to use the official Rancher OS already on Amazon. Create it with the AMI from the list here appropriate to your region.

  Instructions on creating EC2 instances can be found on AWS.

  .. todo:: Add link for instructions.

3. Get databases (RDS)
^^^^^^^^^^^^^^^^^^^^^^^

  You'll need three databases. One's for rancher, one's for transactions, and one's for stored data. Launch all three with the database security group created previously. t2.medium is the recommended size for all of them.

  * Rancher DB: MySQL
  * Transaction DB: Postgres
  * Data DB: Postgres

  Instructions on creating RDS Instances can be found on AWS.

  .. todo:: Add link for instructions.

4. Prepare the transactions database
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  Connect to the transactions database just created using any Postgres client and run the following code to make a transactions table::

      create table transactions (
         id  SERIAL PRIMARY KEY,
         query TEXT not null,
         bindings TEXT
      )

5. Get an S3 Bucket
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  Create a new S3 bucket with open permissions for all traffic.

  .. todo:: Give more details.

#. Get Cloudfront
^^^^^^^^^^^^^^^^^^^

  Setup cloudfront to point to the new bucket.

  .. todo:: Give more details.

#. Get AWS CLI Tools
^^^^^^^^^^^^^^^^^^^^^

  Follow Amazon's instructions for installing the AWS CLI `here <https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html>`_. Alternatively, you could use `Homebrew <https://brew.sh>`_ if you're on a Mac.

#. Set up an IAM User
^^^^^^^^^^^^^^^^^^^^^^

  This will be programmatic access from the command line AWS tools via the prepareToDeploy.sh script.

  Run ``aws configure`` from your local computer and enter in the appropriate information to set up the AWS CLI.

  .. todo:: Give more details.

Setup Rancher
--------------

1. Login to Rancher
^^^^^^^^^^^^^^^^^^^^

  SSH into the Rancher EC2 instance and start the docker container for Rancher. Replace the capitalized parts of the following command with the information for the rancher database created earlier.

  .. code-block:: bash

    sudo docker run -d --restart=unless-stopped --name=rancher -p 8080:8080 rancher/server --db-host DB_URL --db-port 3306 --db-user DB_USER --db-pass DB_PASSWORD --db-name DB_NAME

  You should now be able to connect to Rancher's web interface by going to the EC2 URL at port 8080. It's recommended you set a password by following the instructions here.

#. Add a Password
^^^^^^^^^^^^^^^^^

   Go to Admin > Access Control and set up an access control type of your choice.

2. Add a host
^^^^^^^^^^^^^^^^^

  Go to Infrastructure > Hosts > Add Host. Use the public IP of the current Rancher EC2 instance for the public IP of the host and run the command given in the SSH connection already open.

Prepare Locally
---------------

#. Set Variables
^^^^^^^^^^^^^^^^^^^

  The ".env" in the root directory of Pushkin is used to house the configuration of a myriad of settings. Open it in a plain text editor and enter in the corresponding information for each line.

1. prepareToDeploy
^^^^^^^^^^^^^^^^^^^

  This step of deployment has been greatly simplified with the inclusion of the script "prepareToDeploy.sh", which is located in the root folder of the repo. Make sure the Docker daemon is running and then execute this script from a terminal (e.g. ./prepareToDeploy.sh).

  It will prompt you for multiple things. Follow as you wish. Unless you've modified the Pushkin structure or changed important file names, the defaults should be all set.

  It will handle compiling the website, copying over files to the server, creating docker images, uploading those images to docker hub, and syncing static website files with the S3 bucket. Finally, it will generate a new docker compose file that's free of all environment variables (set in .env, the environment file), which will satisfy rancher.


1. Create a new stack
^^^^^^^^^^^^^^^^^^^^^^^

  Go to Stacks > New Stack in the Rancher web UI and upload the docker-compose file the prepareToDeploy script generated for you (called "docker-compose.production.noEnvDependency.yml" by default).


.. todo::

  Add in information regarding:
    - load balancing
    - autoscaling
    - notes on cloudfront invalidation (see `here <https://aws.amazon.com/blogs/aws/new-cloudfront-feature-invalidation/>`_)
