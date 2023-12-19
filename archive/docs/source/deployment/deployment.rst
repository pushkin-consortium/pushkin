.. _deployment_index:

Deployment
============

These pages explain deployment in significantly more detail. 

Local Deployment
##################

FUBAR

DEV: Local Deployment Stack
------------------

In the official website templates, the ``front end`` app was created with `create-react-app <https://github.com/facebook/create-react-app>`. This handle toolbox handles babel and webpack so that you don't have to. 

By default, create-react-app expects local tests to listen on port 3000. However, this is the port that our API uses. Thus, you will see that the custom start script in ``package.json`` requests port 80:

:: javascript
  
  "scripts": {
    "start": "PORT=80 react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },

The `docker-compose.dev.yml` file likewise specifies that port 80 is open. 

:: json

  server:
    build: ./front-end
    environment:
      API_PORT: '3000'
    ports:
      - '80:80'
      - '433:433'
    links:
      - api


Deploying to AWS
##################

Setting up AWS
---------------

Requirements
~~~~~~~~~~~~~~~

These instructions assume you have:

* a working version of Pushkin (see :ref:`gettingstarted`)
* access to AWS
* a DockerHub account

Define security groups
~~~~~~~~~~~~~~~
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

  Instructions on creating an EC2-security-group_ can be found on AWS. * Note: Link for linux instances *

  .. _EC2-security-group: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html


  Instructions on creating a database-security-group_ can be found on AWS.

  .. _database-security-group: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html


Get an EC2
~~~~~~~~~~~~~~~


  The most straightforward way to do this is to use the official Rancher OS already on Amazon. Create it with the AMI from the list here appropriate to your region.

  Instructions on creating EC2_ instances can be found on AWS.

.. _EC2: https://docs.aws.amazon.com/efs/latest/ug/getting-started.html


Get databases (RDS)
~~~~~~~~~~~~~~~


  You'll need three databases. One's for rancher, one's for transactions, and one's for stored data, which we will refer to as Main DB. Launch all three with the database security group created previously. t2.medium is the recommended size for all of them.

  * Rancher DB: MySQL
  * Transaction DB: Postgres
  * Main DB: Postgres

  Instructions on creating RDS_ Instances can be found on AWS.

.. _RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.html

Prepare the transactions database
~~~~~~~~~~~~~~~

  
  The transaction database serves as a running log of queries to the Main DB, recording all activity which passes through it. 

  Connect to the transactions database just created using any Postgres client and run the following code to make a transactions table::

      create table transactions (
         id  SERIAL PRIMARY KEY,
         query TEXT not null,
         bindings TEXT
      )

Get an S3 Bucket
~~~~~~~~~~~~~~~


  Next, you'll need an S3 bucket for file backups, data storage, and retrieval. Create a new S3 bucket with open permissions for all traffic.

  Instructions on creating S3_ buckets can be found on AWS.

  .. _S3: https://docs.aws.amazon.com/quickstarts/latest/s3backup/welcome.html

Get CloudFront
~~~~~~~~~~~~~~~


  Now, you will need an AWS CloudFront distribution. CloudFront connects to an S3 bucket, and serves to distribute the contents of that bucket, which could include pickled objects, data-sets, and other resources, to any web application which possesses a CloudFront URL. 
  
  This URL is provided to Pushkin in the .env file located in the root folder. 

  Instructions on creating CloudFront_ distributions can be found on AWS.

  .. _CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/GettingStarted.html

Get AWS CLI Tools
~~~~~~~~~~~~~~~


  Follow Amazon's instructions for installing the AWS CLI `here <https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html>`_. Alternatively, you could use `Homebrew <https://brew.sh>`_ if you're on a Mac.

Set up IAM Users and Roles
~~~~~~~~~~~~~~~

  You will need some way of securely controlling access to AWS services and resources. This can be done by setting up IAM roles and users, which allows other developers and contributers to access your resources without needing to share access keys or passwords.

  More information on IAM users can be found `on Amazon's website <https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html>`_

Preparing Pushkin to Deploy
---------------

Depending on how you've set up Pushkin and your experiments, some of the database credentials may have to be changed. If your experiments are using the local testing database, make sure to change connection information in the experiments' ``config.yaml`` files.

You'll also likely want to add a new database in the main ``pushkin.yaml`` file. This will let you setup the database for your experiment with the CLI command. See :ref:`adding_a_database` in the getting started guide for reference.

FUBAR

.. include:: ../links/links.rst
