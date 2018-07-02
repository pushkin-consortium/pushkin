# Deploying Pushkin

## Requirements

These instructions assume you have:

- a working version of Pushkin
- access to AWS
- a Docker (Hub) account



## Setup AWS

### 1. Define security groups

You'll need two security groups — one for rancher and one for the databases.

- The rancher EC2 security group should be open to all traffic on ports 80 (tcp) and 8080 (also tcp). This is for normal web access and the rancher management web UI respectively.
- The database security group should be open to all traffic on ports 3306 (MySQL) and 5432 (Postgres).

Instructions on creating a security group can be found [on AWS](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-network-security.html#creating-security-group).

### 2. Get an EC2

The most straightforward way to do this is to use the official Rancher OS already on Amazon. Create it with the AMI from the list [here](https://github.com/rancher/os/blob/master/README.md#amazon) appropriate to your region.

Instructions on creating EC2 instances can be found [on AWS](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/launching-instance.html).

### 3. Get databases (RDS)

You'll need three databases. One's for rancher, one's for transactions, and one's for stored data. Launch all three with the database security group created previously. t2.medium is the recommended size for all of them.

- Rancher DB: MySQL
- Transaction DB: Postgres
- Data DB: Postgres

Instructions on creating RDS Instances can be found [on AWS](http://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.html).

### 4. Prepare the transactions database

Connect to the transactions database just created using any postgres client and run the following code to make a transactions table.

```sql
create table transactions (
   id  SERIAL PRIMARY KEY,
   query TEXT not null,
   bindings TEXT
)
```





## Prepare Locally

### 1. prepareToDeploy

This step of deployment has been greatly simplified with the inclusion of the script "prepareToDeploy.sh", which is located in the root folder of the repo. Make sure the Dcoker daemon is running and then execute this script from a terminal (e.g. `./prepareToDeploy.sh`).

It will prompt you for multiple things. Follow as you wish. Unless you've modified the structure or changed important file names, the defaults should be all set.

It will handle compiling (**NOT DONE YET – front-end/compile.js is broken**), copying over files to the server, creating docker images, and uploading those images to docker hub. Finally, it will generate a new docker compose file that's free of all environment variables (set in .env, the environment file), which will make rancher happy later on.



## Setup Rancher

###1. Login to Rancher

SSH into the Rancher EC2 instance and start the docker container for Rancher. Replace the capitalized parts of the following command with the information for the rancher database created earlier.

```bash
sudo docker run -d --restart=unless-stopped --name=rancher -p 8080:8080 rancher/server \
    --db-host DB_URL --db-port 3306 --db-user DB_USER --db-pass DB_PASSWORD --db-name DB_NAME
```

You should now be able to connect to Rancher's web interface by going to the EC2 URL at port 8080. It's recommended you set a password by following the instructions [here](https://docs.rancher.com/rancher/v1.3/en/configuration/access-control/).

### 2. Create a new stack

Create a new stack through the web UI and upload the docker-compose file the prepareToDeploy script generated for you (probably called something like "docker-compose.production.noEnvDependency.yml").

### 2. Add a host



## Setup Autoscaling



# Maintenance & Troubleshooting

## Logs

- Nginx (server) logs are stored inside the container in /var/log/nginx/access.log and /var/log/nginx/error.log. The standard nginx docker image symlinks these to stdout and stderr respectively, the combination of which can be viewed by running `docker logs [container]` outside of the container.

