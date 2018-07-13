## Requirements


You can use the names of the images from your local computer, not dockerhub in docker.compose.production

dockerfile front-end - add commands to copy stuff
cp ../server/nginx.conf

npm run build in public and stuff to create assets.json
docker build . -q
ID=$(docker build .-q)
run.js:
url: processs.env.NODE_ENV =="production" ? cloundfront" : localhost

docker run -p 80:80 [PASTE ID]

npm run build --debug
npm run --debug build

then 
docker build . -q
docker run -p 80:80 [paste ID]

docker build . -t gww/front-end-server

server image replace with front-end-server

docker-compose -f docker-compose.production.yml up

You need git for the various steps of deployment. If you are working on a Mac, you have git already installed. If you are working on a PC, make sure you install git and familiarize yourself with the basic commands before proceeding.

You will need a [GitHub](https://github.com) account. Ensure that you have created one before proceeding.

You will need to install [Docker](https://docs.docker.com/docker-for-mac/install/#download-docker-for-mac) and [create an account] (https://id.docker.com).

You will need a Postgres manager. For example, you can download [SQLPro for Postgres](https://macpostgresclient.com/).

You will need an [Amazon Web Services](https://aws.amazon.com/free/?sc_channel=PS&sc_campaign=acquisition_US&sc_publisher=google&sc_medium=cloud_computing_b&sc_content=aws_url_e_control_q32016&sc_detail=amazon.%20web%20services&sc_category=cloud_computing&sc_segment=188908164670&sc_matchtype=e&sc_country=US&s_kwcid=AL!4422!3!188908164670!e!!g!!amazon.%20web%20services&ef_id=WUGhAAAAAHs2P1qP:20171016145411:s.) account.

Some repository and file names should be changed when customizing the setup. However, the instructions will contain the original names or placeholders for simplicity. Make sure you replace all the relevant names in any commands you execute.

##Forking the Relevant Repos to Work on a Custom Setup
Once you have logged into your GitHub account, navigate to the [Games With Words organization](https://github.com/gameswithwords). Click on [**gww**](https://github.com/gameswithwords/gww) and fork the repository. Change the name of the repository (Settings->Repository name). 
Return to the [Games With Words organization](https://github.com/gameswithwords), and fork [**cron**](https://github.com/gameswithwords/cron), [**experiments**](https://github.com/gameswithwords/experiments), and [**front-end**](https://github.com/gameswithwords/front-end).

##Local Deployment and Testing

###Setting Up Databases

Open your Postgres manager, select **New** and fill out the following fields:

**Server host:** localhost  
**Login:** postgres  
**Server port:** 5432  
**Database:** dev

Create another database with the following information:

**Server host:** localhost  
**Login:** postgres  
**Server port:** 5433  
**Database:** transactions_dev

### Front End Deployment
  
* Open Terminal
* You will need to clone the forked and renamed **gww** repository:   

```
 git clone --recursive [URL]   
```

<span style="color:red">**Important Note**:</span> When cloning, always use https instead of ssh.

* Change the working directory to the folder containing the cloned **gww** repository.
* To place the contents of the **cron**,**experiments**, and **front-end** repositories in the appropriate submodules of **gww**, you will need to remove the submodules which got cloned along with the **gww** repository. The commands to do that are as follows:   

```
$ git submodule deinit cron
  
$ git rm –f cron

$ git submodule deinit experiments

$ git rm -f experiments

$ git submodule deinint

$ git submodule deinit front-end

$ git rm -f front-end
```

* Next, you will need to add the deleted submodules from the forked repositories on your GitHub account (again, these are **experiments**, **cron**, and **front-end**). Replace [URL] in the following command with the GitHub URL for each of those repositories before executing:

```
$ git submodule add [URL] 
```

* Navigate to the [pushkin-npm organization](https://github.com/pushkin-npm) on GitHub. Click on [pushkin-cli](https://github.com/pushkin-npm/pushkin-cli).
* Clone this repository in the directory containing **gww** (`git clone [URL]`).
* Change your working directory to the folder containing the cloned **pushkin-cli** repository and install:

```
$ cd pushkin-cli

$ npm install –g ./
```
To test whether the Pushkin installation was successful run the command `pushkin`. If the installation was successful, you will get a list of commands that you can execute:

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-08-25%20at%203.29.12%20PM.png)


* Change the working directory back to **gww** (`cd gww`) and run `pushkin sync`

* Change the working directory to **front-end** (`cd front-end`) and run the following commands:

```
$ npm install

$ npm start
```
At this point you should be able to see the front end of the website in your browser.

### Setting Up a Running Docker Container Locally
In **gww** run:

```
$ docker-compose -f docker-compose.debug.yml up
```
After the Docker container has been initiated, `cd` into `db-worker` and run `docker ps`. You will get a list of containers with their IDs, STATUS, PORTS, and NAMES. Copy the container ID of `db-worker`

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-08-31%20at%2012.27.35%20PM.png)

Run the following command:

```
$ docker exec -it CONTAINER_ID bash
```

Followed by:

```
$ npm run migrations
```
If you have a stimuli file that you would like to use for a quiz, you can run the following command:

```
$ node seeder.js NAME_OF_QUIZ
```
A series of questions will appear; the answer to all of them should be **Yes**.

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-08-31%20at%2012.43.22%20PM.png)

To sync all of the updates, run `pushkin sync` from the **gww** folder.

<span style="color:red">**Important Note**:</span> Every time you make changes to files you will need to rebuild the Docker containers, since the changes do not get updated automatically. To do this, run the following command:

```
$ docker-compose -f docker-compose.debug.yml up --build
```

##Live Deployment

Once you have confirmed that your website works locally, you can begin live deployment. At this point, you should have a working Dockerhub ID. Ensure that you are signed in to Dockerhub on your computer before proceeding.

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-10-20%20at%2010.13.28%20AM.png)

#### Amazon Web Services (AWS)
Open your AWS account, and go to **IAM** -> **Users**. You need to add a new user that will later be used by Rancher. It should have Programmatic Access and the following permissions:

**AmazonEC2FullAccess**   
**AmazonRoute53FullAccess**

Once the user is created, you need to download the csv file with the security credentials which will be used later.

Next, go to **Storage** -> **S3**. Create a bucket with the following configuration:

Bucket name: YOUR\_BUCKET\_NAME
Region:US East (N. Virginia)
Manage public permissions: Grant public read access to this bucket

Once the bucket is created, click on it and select **Permissions** -> **Bucket Policy**. Use the following policy:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadForGetBucketObjects",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::BUCKET_NAME/*"
        }
    ]
}

```

changing BUCKET_NAME to the name you gave your S3 bucket. You will also need to change the CORS configuration to:

```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <MaxAgeSeconds>3000</MaxAgeSeconds>
    <AllowedHeader>Authorization</AllowedHeader>
</CORSRule>
</CORSConfiguration>
```

After saving the S3 bucket settings, open the file **run.js** located in the **front-end** folder. On line 112, change the bucket name to the name of the bucket you just created:

```
 s3Params: { Bucket: 'YOUR_BUCKET_NAME' },
```

Go back to **AWS** -> **Cloudfront** -> **Create Distribution** -> **Web**.
Use the following settings:

* Origin Domain Name: YOUR_BUCKET.s3.amazonaws.com
* Origin ID: S3-YOUR_BUCKET
* Viewer Protocol Policy: HTTP and HTTPS
and **Create Distribution**.

Click on the newly created distribution and go to **Behaviors** -> **Edit** -> **Cache Based on Selected Request Headers** -> **Whitelist**
From the Filter Headers options select **Origin** -> **Add** and then select **Yes, Edit** on the bottom of the settings page to finish.

From the **Cloudfront Distributions** page take the domain name of your distribution and insert it on line 22 of **run.js**:

```
url: 'https://YOUR_DISTRIBUTION.cloudfront.net/',
```
Next, open /front-end/core/baseUrl.js and replace the Cloudfront URL with the new one.

Next, open front-end/webpack.config.js and edit the cloudfront distribution on line 45:

```
publicPath: isDebug ? '/dist/' : "//YOUR_DISTRIBUTION.cloudfront.net/dist/",
```

#### Building and tagging containers

In a new Terminal window, `cd` into `front-end` and run the following script (editing the relevant parts first):

```
env NODE_ENV=production npm run publish &&
cd .. &&
cp -rf ./front-end/public/**.ico ./server/html &&
cp -rf ./front-end/public/**.txt ./server/html &&
cp -rf ./front-end/public/**.html ./server/html &&
cp -rf ./front-end/public/**.xml ./server/html &&
docker build -t DOCKERHUB_ID/api:latest api &&
docker build -t DOCKERHUB_ID/cron:latest cron &&
docker build -t DOCKERHUB_ID/db-worker:latest db-worker &&
docker build -t DOCKERHUB_ID/server:latest server &&
docker build -t DOCKERHUB_ID/QUIZ_NAME:latest workers/QUIZ_NAME &&
docker push DOCKERHUB_ID/api &&
docker push DOCKERHUB_ID/cron &&
docker push DOCKERHUB_ID/db-worker &&
docker push DOCKERHUB_ID/server
docker push DOCKERHUB_ID/QUIZ_NAME 

```


#### Security Groups 

In your **AWS** account, go to **Security Groups** -> **Create Security Group**

1. Database security group (DATABASE\_SECURITY\_GROUP)
    
**Rules**:     
 MySQL/Aurora - TCP - 3306 - Anywhere     
 PostsgreSQL - TCP - 5432 - Anywhere     
 
2. Rancher security group (RANCHER\_SECURITY\_GROUP) 
  
**Rules**:       
HTTPS - TCP - 80 - Anywhere    
HTTPS - TCP - 443 - Anywhere   
Custom TCP - TCP - 8080 - Anywhere    
SSH - TCP - 22 - Anywhere     


#### Creating Databases

Go back to **AWS** -> **Services** -> **RDS** -> **Launch DB Instance**

1. **Amazon Aurora** (for Rancher)

* Instance specifications:

	**DB instance class**: db.t2.small        
	**Multi-AZ deployment**: No   
	**DB instance identifier**: YOUR\_IDENTIFIER       
	**Master Username**: YOUR\_USERNAME (will be used to log in to the database)     
	**Master Password**: YOUR_PASSWORD   
	**VPC Security groups**: Select existing VPC security groups: DATABASE\_SECURITY\_GROUP     
	**DB Cluster Identifier**: YOUR\_IDENTIFIER  
	**Database name**: YOUR\_DATABASE\_NAME
	**Database port**: 3306   
	**Backup retention period**: 7 days
	**Maintenance window**: Select window: SELECT\_A\_WINDOW    
	
	At this point you are ready to click on **Launch Instance** and move on to creating the other databases.
	
2. **PostgreSQL** (main database)

* Instance specifications:

	**DB instance class**: db.t2.medium        
	**Multi-AZ deployment**: Yes     
	**Allocated storage**: 100GB  
	**DB instance identifier**: YOUR\_IDENTIFIER       
	**Master Username**: YOUR\_USERNAME (will be used to log in to the database)     
	**Master Password**: YOUR_PASSWORD   
	**VPC Security groups**: Select existing VPC security groups: DATABASE\_SECURITY\_GROUP       
	**Database name**: YOUR\_DATABASE\_NAME   
	**Database port**: 5432   
	**Backup retention period**: 7 days
	**Maintenance window**: Select window: SELECT\_A\_WINDOW    
	
3. **PostgreSQL** (transactions database)

* Instance specifications:

	**DB instance class**: db.t2.small       
	**Multi-AZ deployment**: Yes     
	**Allocated storage**: 20GB  
	**DB instance identifier**: YOUR\_IDENTIFIER       
	**Master Username**: YOUR\_USERNAME (will be used to log in to the database)     
	**Master Password**: YOUR_PASSWORD   
	**VPC Security groups**: Select existing VPC security groups: DATABASE\_SECURITY\_GROUP       
	**Database name**: YOUR\_DATABASE\_NAME   
	**Database port**: 5432   
	**Backup retention period**: 7 days
	**Maintenance window**: Select window: SELECT\_A\_WINDOW 
	
When you are done creating the databases, go back to the list of **Instances** and get the endpoints for the databases you created by clicking on them and scrolling down to **Connect** -> **Endpoint**

#### Configuring ***docker-compose.production.yml***

Go back to the **gww** folder, and find the file called **docker-compose.production.yml**. Open the file in a text editor and change the following:

* For every image, change the DOCKERHUB_ID to your Dockerhub ID;
* Insert the DATABASE\_URL and TRANSACTION\_DATABASE\_URL (the format for those is: **postgres://user\_name:password@host:port/database_name**), they appear twice - under environment for **cron** and for **db-worker**).

### Creating a Rancher Instance on AWS

Go back to your **AWS account** -> **Launch Instance** -> **AWS Marketplace** -> **Search** -> **Rancher** and select the first option.

* Instance configuration:    
  **Type**: t2.medium  
  **Enable termination protection**: Yes    
  **Size**: 16GiB  
  **Add Tag**: key=Name, value=NAME\_OF\_RANCHER\_INSTANCE   
  **Security Group**: Select Existing: RANCHER\_SECURITY\_GROUP
  **Key Pair**: your choice, but make sure you have access to the private key for the pair you choose! 
 
 Launch the instance!
 
 #### Elastic IP
 
 In your AWS account, find **Elastic IP** (you can use the search field) -> **Allocate new address** -> **Allocate**
 Once it has been created, select it, and from the **Actions** menu select **Associate address**. Select your Rancher instance and then **Associate**
 
Find Route 53 in your AWS account. Your domain name should appear under **Hosted Zones**. Click on it and then on **Create Record Set**:

Name: YOUR\_RANCHER\_INSTANCE\_NAME.domain\_name       
Value: YOUR\_RANCHER_\INSTANCE\_IP

  

 
### Setting Up the Rancher Instance
First, you will need to open **nginx.conf** in a text editor and edit the following: 

**line 12:** server-name YOUR\_RANCHER\_INSTANCE\_NAME.domain\_name   
**line 13:**  ssl\_certificate  /etc/nginx/ssl/NAME\_OF\_YOUR\_CERTIFICATE.crt        
**line 14** ssl\_certificate\_key  /etc/nginx/ssl/NAME\_OF\_YOUR\_KEY.key
**line 35:** server-name YOUR\_RANCHER\_INSTANCE\_NAME.domain\_name 

**NOTE:** You will need to generate the SSL certificates before this step, and you can use a provider of your choice (we use namecheap.com).

I recommend using an SSH client such as [Termius](https://www.termius.com/) to connect to the instance, but you can also SSH to your instance from Terminal on your Mac (`ssh –i path_to_key  rancher@IP_OF_INSTANCE `). 

**NOTE:** The IP of the Rancher instance will be the Elastic IP you just associated with it.

Create a directory named rancher (`mkdir rancher`) and `cd` into it.


You will need to transfer the **nginx.conf** file, the **.crt** file, and the **.key** file to the Rancher instance and place them in the rancher directory. You can use an FTP client such as [FileZilla] (https://filezilla-project.org/) or use [scp](http://angus.readthedocs.io/en/2014/amazon/transfer-files-between-instance.html).

You will need to execute the following commands:

```
sudo docker run -d --restart=unless-stopped --name=rancher-server -p 8080:8080 rancher/server --db-host DB_URL --db-port 3306 --db-user DB_USER --db-pass DB_PASS --db-name DB_NAME
```

**NOTE:** Do not forget to change the DB\_URL, DB\_USER, DB\_PASS and DB_NAME to the values for your **Amazon Aurora** database created earlier. Followed by:

```
sudo docker run -d --restart=unless-stopped --name=nginx -v ~/rancher/nginx.conf:/etc/nginx/conf.d/default.conf -v ~/rancher/YOUR_CERTIFICATE_NAME.crt:/etc/nginx/ssl/YOUR_CERTIFICATE_NAME.crt -v ~/rancher/YOUR_KEY_NAME.key:/etc/nginx/ssl/YOUR_KEY_NAME.key -p 80:80 -p 443:443 --link=rancher-server nginx
```
You can use `docker ps` to check and make sure you have a running container. If you encounter any error messages, use the following command:

```
docker stop $(docker ps -a -q) && docker rm $(docker ps -a -q) && docker rmi $(docker images -q)

```
and then repeat: 

```
sudo docker run -d --restart=unless-stopped --name=nginx -v ~/rancher/nginx.conf:/etc/nginx/conf.d/default.conf -v ~/rancher/YOUR_CERTIFICATE_NAME.crt:/etc/nginx/ssl/YOUR_CERTIFICATE_NAME.crt -v ~/rancher/YOUR_KEY_NAME.key:/etc/nginx/ssl/YOUR_KEY_NAME.key -p 80:80 -p 443:443 --link=rancher-server nginx
```

You will also need to run:

```
docker exec –it nginx bash
service nginx restart
```

**NOTE:** You can use CTRL+D to get out of the instance after executing the last command.


### Rancher
At this point, if everything worked well, you can open a browser of your choice and point it to the IP of your Rancher instance (The Elastic IP you gave it earlier should be displayed in your AWS account under EC2 next to the name of the instance) or the alias (YOUR\_RANCHER\_INSTANCE\_NAME.domain\_name). You should not get any error messages and the Rancher GUI should be available to you.

By default, Access Control in Rancher is not configured. Anyone who has the IP of your Rancher instance can access the Rancher GUI. It is highly recommended that you set up access control. This is how you do it:

**Admin** -> **Access Control** -> **Local**

Enter the credentials you would like to use and click on **Enable Local Auth**

Next, go to **Infrastructure** -> **Hosts** -> **Add a Host**

You will need to select a **Host Registration URL**; choose **Something else**, copy the address from "This site's address" above, edit it from https to **http** and add **:8080** to the end of it.

On the next page, choose **Amazon EC2:**

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/ec2.png)

and fill out the remaining settings as follows (use the access key and secret key from the AWS Rancher user credentials you downloaded earlier):

**Region**: us-east-1    
**Access key**: Your AWS access key        
**Secret key**: Your AWS secret key
**VPC/Subnet**: vpc
**Security group**: Custom: Choose an existing group: rancher-machine
**Name**: YOUR\_HOST_NAME
**Instance type**:t2.medium
**SSH User**: rancher
**AMI**: Rancher OS AMI List: copy the AMI for us-east-1

To check if the host is being created after you click on **Create**, go to **Infrastructure** -> **Hosts** and you should be able to see your new host.

### The Transactions Database

You will need to create a table in the transactions database. Open your Postgres manager. Enter the following:

Server host: YOUR\_DATABASE\_ENDPOINT   
Login: DATABASE\_USERNAME    
Password: YOUR\_DATABASE\_PASSWORD    

Once you are connected to the transactions database, you will need to go back to the main repository folder and find a script called **CreateTransactionDB.sql**. Copy the contents of this script and run them in the Postgres manager. This step will create the table for your transactions.

### More on Rancher

In the main repository folder, find **rancher-compose.yml**. If you have added new quizzes, you will need to add them to the end of the file following this format:

```
NAME_OF_QUIZ:
    scale: 1
    start_on_create: true
```

In order to add an SSL certificate:       

Go back to the Rancher GUI in your browser and go to:
**Infrastructure** -> **Certificates** -> **Add Certificate**

You will need to provide the following (these are the same as the ones you used when setting up the Rancher instance):

Name: YOUR\_CERTIFICATE\_NAME
Private key: YOUR\_PRIVATE\_KEY
Certificate: YOUR\_CERTIFICATE     
Chain Cert: your .ca-bundle file 

Next, go to **Stacks** -> **User** -> **Add Stack** 

Enter the following:

**Name**: YOUR\_STACK_NAME   
**Optional: docker-compose.yml**: use the contents of docker-compose.production.yml (located in the **gww** folder)
**Optional: rancher-compose.yml**: use the contents of rancher-compose.yml (located in the **gww** folder) 

You will need to upgrade the load balancer as soon as it is created.

Once all the services become active, click on **db-worker** and from the options select **Execute Shell**. Run the following commands in the shell:

```
npm run migrations
node seeder.js NAME_OF_QUIZ
```
You should repeat the second command for as many quizzes as you have. If you see the names of your stimuli it means that you were successful.

###Setting up DNS in Rancher

Under **Catalog** find **Route 53** and click on **View Details**. Enter the AWS Secret Access Key and AWS Access Key ID for the Rancher user created earlier. Enter the following:

**Hosted Zone Name:** YOUR\_DOMAIN\_NAME.     
**Hosted Zone ID:** YOUR\_HOSTED\_ZONE\_ID (found on **AWS** under **Route 53**).

You will also need to create a new Record Set on Route 53 under your domain name. The **Name** should be your domain, and the **Value** should be the URL of the load balancer.

###Autoscaling

In Rancher, go to **API** -> **Webhooks**

You can create webhooks to scale up and down. The type for those should be the name of your Rancher host.

Next, from **Catalog** find Datadog and launch.

You will also need to create a Datadog account and set up the autoscaling using it.

###Setting up Auth0
**1. Creating an Auth0 account**

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/auth1.png)

You will be asked to select a tenant domain, which will be used later on as a CLIENT_ID. On the next page, you will select company name, type of account and role.

You will then need to go to **Clients** -> **New Client** and create a client for your website/application. Select the type of application (for Pushkin, it is a single page web application and the front-end uses React). In the settings, you will need to edit the **Allowed Callback URLs** (current setup:

```
http://localhost:3000/callback, 
http://localhost:8000/loading, 
http://localhost:8000/quizzes/listener-quiz

```

and **Allowed Origins (CORS)**

```
http://localhost:3000/callback, http://localhost:8000/loading, http://localhost:8000/quizzes/listener-quiz, http://localhost:8000/, http://localhost:8000/dashboard
```

In **Clients** -> **YOUR_CLIENT** -> **Settings** -> **Advanced Settings** -> **OAuth** turn OIDC Conformant off! This will prevent a number of error messages. Don't forget to 'Save changes'




**2. In the project folders**

Files to update: 

In the api folder:
**.env** - change all the URLs, SECRET, and CLIENT_ID:

```
JWKS_URI=https://YOUR_CLIENT.auth0.com/.well-known/jwks.json
AUDIENCE=https://YOUR_CLIENT.auth0.com/api/v2/
ISSUER=https://YOUR_CLIENT.auth0.com/
PORT=3000
SECRET= YOUR_TOKEN (from APIs -> Auth0 Management API -> API Explorer in your Auth0 account, you will need to set the token expiration to an extremely big number)
CLIENT_ID=YOUR_CLIENT_ID (from Clients -> YOUR_CLIENT in your Auth0 account)
OAUTH_URL=https://YOUR_CLIENT.auth0.com/oauth/token

```

In the front-end folder:
**auth0-variables.js**:

```
export const AUTH_CONFIG = {
  domain: 'YOUR_CLIENT.auth0.com',
  clientId: 'YOUR_CLIENT_ID',
  callbackUrl: 'http://localhost:8000/loading',
  audience: 'https://YOUR_CLIENT_ID.auth0.com/api/v2/'
};

```

**auth.js**

```
line 54: return Axios.patch(`https://YOUR_CLIENT.auth0.com/api/v2/users/${userId}`, data, {

line 73: return Axios.get(`https://YOUR_CLIENT.auth0.com/api/v2/users/${userId}`, {

line 97: client_id: 'YOUR_CLIENT_ID',

line 102:  'https://YOUR_CLIENT.auth0.com/dbconnections/change_password',
```
In the api folder:
**auth.js**
```
line 9:  url: `https://gameswithwords.auth0.com/api/v2/users/${req.params.id}`,
```



To enable social connecitons:

**Connections** -> **Social**

Instructions for Facebook: https://auth0.com/docs/connections/social/facebook

Instructions for Google: https://auth0.com/docs/connections/social/google

## Getting rid of the forum/Auth0
- config.js in api (to get rid of authentication or the forum functionality)
- config.js in front-end (to get rid of the tab on the website)


## Deploying something new