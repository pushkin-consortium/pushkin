.. _setup_aws:

Set Up AWS
===================

Requirements
----------------

These instructions assume you have:

* a working version of Pushkin (see :ref:`get-pushkin`)
* access to AWS
* a Docker (Hub) account

Define security groups
---------------------------
  You'll need two security groups: one for rancher and one for the databases.

  The rancher EC2 security group should be open to all traffic on ports

    =====   =========
    Port    Protocol
    =====   =========
    80      TCP
    443     TCP
    8080    TCP
    500     UDP
    4500    UDP
    =====   =========
      
  This is for normal web access, the rancher management web UI, and the Rancher host infrastructure.
  The database security group should be open to all TCP traffic on ports 3306 (MySQL) and 5432 (Postgres).
  Instructions on creating a security group can be found on AWS.
  .. todo:: Add link for instructions.

Get an EC2
---------------------------

  The most straightforward way to do this is to use the official Rancher OS already on Amazon. Create it with the AMI from the list here appropriate to your region.

  Instructions on creating EC2_ instances can be found on AWS.

.. _EC2: https://docs.aws.amazon.com/efs/latest/ug/getting-started.html


Get databases (RDS)
---------------------------

  You'll need three databases. One's for rancher, one's for transactions, and one's for stored data. Launch all three with the database security group created previously. t2.medium is the recommended size for all of them.

  * Rancher DB: MySQL
  * Transaction DB: Postgres
  * Data DB: Postgres

  Instructions on creating RDS_ Instances can be found on AWS.

.. _RDS: https://docs.aws.amazon.com/efs/latest/ug/getting-started.html

Prepare the transactions database
---------------------------

  Connect to the transactions database just created using any Postgres client and run the following code to make a transactions table::

      create table transactions (
         id  SERIAL PRIMARY KEY,
         query TEXT not null,
         bindings TEXT
      )

Get an S3 Bucket
---------------------------

  Create a new S3 bucket with open permissions for all traffic.

  .. todo:: Give more details.

Get Cloudfront
---------------------------

  Setup cloudfront to point to the new bucket.

  .. todo:: Give more details.

Get AWS CLI Tools
---------------------------

  Follow Amazon's instructions for installing the AWS CLI `here <https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html>`_. Alternatively, you could use `Homebrew <https://brew.sh>`_ if you're on a Mac.

Set up an IAM User
---------------------------

  This will be programmatic access from the command line AWS tools via the prepareToDeploy.sh script.

  Run ``aws configure`` from your local computer and enter in the appropriate information to set up the AWS CLI.

  .. todo:: Give more details.

.. todo::

  Add in information regarding:
    - notes on cloudfront invalidation (see `here <https://aws.amazon.com/blogs/aws/new-cloudfront-feature-invalidation/>`_)
