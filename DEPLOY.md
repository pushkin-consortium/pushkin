
# Deploying

## Make sure you have a piece of paper to write all these passwords down.

# Define Security groups

* *DB Security Group* open on mysql port and postgres port open to all IP
* another security group open to ssh traffic and http ports 80 and 8080

Instructions on creating a security group can be found [on AWS site here](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html#creating-security-group)


# Create resources


## Databases
**take note of the database names you create, as well as the user and passwords.**

* a single mysql database to hold the rancher server data. t2.medium is a good size. Insure that you launch it with the DB Security Group you previosuly defined.
* a postgres databases, t2.medium for call this one transactiondb. Insure that you launch it into the DB security group that you defined previously.
* a second postgres databases, t2.medium . Insure that you launch it into the DB security group that you defined previously. This is for production data.

write down the hostnames, ports, db-names, and passwords that you used when creating these.

Instructions on creating RDS Instances can be found [on AWS Site here](http://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.html)

## EC2 instances

* a single ec2 instance with an ssh key that you have access too. Instantiate it with an AMI from the list here that matches your region: https://github.com/rancher/os/blob/master/README.md#amazon. Instructions on how to do this are available on [AWS Documentation here](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/launching-instance.html)

## Docker hub account.
* ensure you have a [dockerhub account](https://hub.docker.com/) that you can push and pull containers from. I have not run this setup with private docker hubs. Your mileage may vary.



At this point the following resources should be available to you

* an empty ec2 instance running RancherOS that is open to all requests and in its own security group
* 3 DB instances that are open on mysql and postgres ports
  * a mysql RDS instance with the db-name, hostname, password, and username written down.
  * a postgres RDS instance with a database name transactiondb and the username, hostname, password.
  * a production postgres RDS instance with a database name, username, hostname, password.
* a working dockerhub account

If these are not available, go to the proper section and read the docs until they are.

## Building containers

* build and tag the images locally by entering each directory and tagging and building each container. A tag takes the form of HUB_USERNAME/CONTAINER_NAME. 
* We have opted for the convertion of pushkin-server, pushkin-api, pushkin-cron, pushkin-db. You can choose whatever you like. In order to tag a container, enter into it and run the following command `docker build -t TAG:latest .`. Do this on all containers that you want to deploy.
* run `docker images` to ensure that you have these containers locally
* push these containers to docker hub by running `docker push TAG`
* Insure that the docker-compose.production.yml references your images. remove all uses of pushkin and point it to your image name.

## Starting up rancher

SSH into the ec2 instance that was previously created. 
Launch the rancher server by replacing the variables in this command with the proper values from the creation of the myql database in [Databases](##Databases).

```
sudo docker run -d --restart=unless-stopped -p 8080:8080 rancher/server \
    --db-host myhost.example.com --db-port 3306 --db-user username --db-pass password --db-name cattle
```

If you have problems, ensure that your mysql DB is in the proper security group. By default AWS makes new RDS instances only open to your local IP.

keep track of the logs by running `docker logs rancher/server`, or `docker ps` and grabbing the container ID.

Once this finishes you should be able to access rancher by visiting the same IP, :8080

It is optional, but highly encouraged to give an elastic IP to this instance and map a subdomain to that.

Set up access control through the provider of your choice by following the [instructions here](https://docs.rancher.com/rancher/v1.3/en/configuration/access-control/)

## Add a host

Add at least one host to your rancher server by following the [Official Rancher Docs](https://docs.rancher.com/rancher/v1.3/en/hosts/amazon/)

## Deploying

### Setting Environment Variables

At this point you have a rancher server running connected to an RDS instance. At least one ec2 host connected to rancher, and 2 RDS postgres instances.

We need to swap out some environment variables in out docker-compose.yml in order to make this system work.

There are 2 ENV variables in the db-worker that need to be changes, `TRANSACTION_DATABASE_URL` and `DATABASE_URL`. Set them equal to the proper `postgres://` url created for each one of the RDS instances created in [DataBases](#Databases)

These urls follow the format of `postgres://user_name:password@host:port/database_name`

### Preparing databases

There is a small sql snippet in the repo that needs to be ran against the transactionDB:

connect as normal using a postgres client ([instructions here](http://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html))

and run the following snippet: (also available as `CreateTransactionDB.sql`)

```
create table transactions (
   id  SERIAL PRIMARY KEY,
   query TEXT not null,
   bindings TEXT
)

```


Test the environment locally by running `docker-compose -f docker-compose.production.yml up` 
Docker will pull your images from docker hub, and use the production database.

Your migrations should be ran automatically, if they are not, `docker exec -it` into the proper pushkin-db-worker container and `npm run migrations`

Additionally, you can run your seeds now if you want.

### Uploading to server

At this point you have an exact mirror copy of your production setup running locally, endpoints are working and user can take quizzes locally.

To deploy this configuration, you just need to create a new stack on your rancher server, upload the `docker-compose.production.yml` you are using locally and wait.


When all the instances are green things are good to go.


## Autoscaling
To implement autoscaling, some knowledge of system metrics is required and a basic idea of how docker containers work.

Autoscaling a pushkin configuration requires 2 parts:
* autoscaling containers based on metrics within those individual containers
* autoscaling hosts based on overall host metrics.


### Autoscaling Hosts

#### Requirements


**Adding custom host snippet from the rancher server!**

There is a small snippet of code on rancher server for adding a custom host. Make sure you have access to that and convert it into a cloud config. It should look something like this:
```
#cloud-config
rancher: 
  services: 
    rancher-agent1: 
      command: "http://XX.xxx.xxx.xxx:8080/v1/scripts/xxx:xxx:xxx"
      image: rancher/agent
      privileged: true
      volumes: 
        - "/var/run/docker.sock:/var/run/docker.sock"
        - "/var/lib/rancher:/var/lib/rancher"
```

Create a launch configuration group with the proper rancher ami. [tutorial available here](http://docs.aws.amazon.com/autoscaling/latest/userguide/GettingStartedTutorial.html#gs-create-lc) and that as the user-data.

Set up alarms with minimum and maximums according to what works for you, and autoscaling alarms on sane cpu percentages. (I am using 70% and 20%)

### Autoscaling Containers

* Create an account at datadog.com
* grab the API key.
* activate both the docker and webhook integrations
* Add a rancher service by selecting 'From Catalog'
* search for datadog launch the stack and paste your api key where needed.
* Ensure it is launched as a 'global service' meaning it will run one container on every host.
* Wait for it to spin up successfuly and watch the metrics on datadog

#### Set up webhooks

Set up webhooks using the rancher UI following [these instructions](https://docs.rancher.com/rancher/latest/en/cattle/webhook-service/) for the service you want to autoscale.

Add those webhooks under the webhooks integration of datadog.

#### Set up alarms


Under the monitoring tab of datadog, create alarms based on `docker.system.cpu` for the individual rancher services, and in the action section you can have the following structure
type `{` and you can get an idea of the other tags that are available.

```
{{#if_alert}}
  @webhook-ping
{{/if_alert}}

```



### Updating
If you tweak your local infrastructure and need to deploy the new services there is a 4 step process.

1. Create the new docker image locally following the instructions above.
2. Push the image to docker hub
3. [Update the service in the UI](https://docs.rancher.com/rancher/v1.5/en/cattle/upgrading/#in-service-upgrade) **Make sure to select "Pull Image before creating"**
4. Watch for fails, rollback as needed

