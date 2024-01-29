# Deploying to AWS

Deploy your basic Pushkin site and experiments to Amazon Web Services.

!!! warning
    **Due to an update in AWS resources, the CLI-based AWS deploy does not currently work and is being updated. In the meantime, you can still manually deploy to AWS.**


## Prerequisites

Before you begin, make sure your have:
 
1. Finished the [Quickstart](../quickstart.md), including [installing a Postgres manager](../quickstart.md##viewing-your-database-with-a-postgres-manager). 
2. Created an [Amazon Web Services](https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc) account. (**Note:** This must be done approximately 24 hours in advance of when you would like to follow this tutorial.) 

## AWS Deployment Steps

* [Install required software.](#install-required-software)
* [Configure the AWS and ECS CLIs.](#configure-the-aws-cli-and-ecs-clis)
* [Register a domain.](#register-a-domain)
* [Set up DockerHub.](#dockerhub)
* [Initialize AWS Deploy](#initializing-aws-deploy)
* [View your data](#view-your-data)


<!---
1. \[Create a DockerHub account\] \([https://id.docker.com](https://id.docker.com)\) if you haven't already. Then tell Pushkin what your DockerHub ID is by running:

```bash
 pushkin setDockerHub
```

You can change your ID at any point by re-running this command.
--->

## Install Required Software

### AWS CLI

[Install](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) the AWS CLI. Install the version for your operating system, not the Docker image.

Configuration steps will follow on the [next page](./configure-aws-and-ecs-clis.md).

### ECS CLI

Install [ECS CLI](https://github.com/aws/amazon-ecs-cli). (Do only the first page. There's no need follow the steps on the 'configuration' page. The Pushkin CLI will handle this for you.)

*Note that the ECS CLI is no longer being actively maintained, so we may probably migrate in the near future.*

## Configure the AWS CLI and ECS CLIs

### AWS CLI

[Configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) the AWS CLI. (The main steps are reproduced below for your convenience.)

First, you will need to generate access keys. Best practices dictate that you [create an IAM Admin User and Group](https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-started_create-admin-group.html) rather than creating root access keys. 

To create an IAM user, sign into [Identity and Access Management](https://console.aws.amazon.com/iam/) in your AWS console using your root user credentials.

![](../../assets/getting-started/deploying-to-aws/aws_8.gif)

Navigate to *My Account* and enable access to billing data for IAM users.

![](../../assets/getting-started/deploying-to-aws/aws_10.gif)

Navigate back to [Identity and Access Management](https://console.aws.amazon.com/iam/), select *Users* in the left sidebar and click **Add user**. 

![](../../assets/getting-started/deploying-to-aws/aws_12.gif)

Set username as `Administrator` and click *Next: Permissions*.

![](../../assets/getting-started/deploying-to-aws/aws_13.gif)

Under the *Add user to group* tab, select **Create group**. Call the group name `Administrators` and check the *AdministratorAccess* job function in the list of policies. Then click *Create group* to continue.

![](../../assets/getting-started/deploying-to-aws/aws_14.gif)

Click through the *Tags* page, review your settings and click **Create user**. Download the CSV with login information.

![](../../assets/getting-started/deploying-to-aws/aws_15.gif)

Return to the *Users* page and select the **Security credentials** tab for the `Administrator` user you just created. 

![](../../assets/getting-started/deploying-to-aws/aws_16.gif)

Under *Access keys*, click **Create access keys**.

![](../../assets/getting-started/deploying-to-aws/aws_17.gif)


Run `aws configure --profile myprofile` (where you substitute `myprofile` with a name of your choosing; this is just in case you want to have multiple logins, which you probably will), pasting your Access Key ID and Secret Access key as needed.

**Note**: When configuring AWS, be sure to specify `us-east-1` as your default region name and `json` as your default output format.

The output should look like this.

```bash
 aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

![](../../assets/getting-started/deploying-to-aws/aws_24.gif)


### ECS CLI

There's no need follow the steps on the ECS CLI 'configuration' page. The Pushkin CLI will handle this for you.


**Note**: In configuring the ECS CLI, you'll need the AWS profile name you are using, as well as the related Access Key ID and Secret Access Key. If you can't remember the name of your profile, you can get a list of active profiles on your computer using:

```bash
 aws configure list-profiles
```

To see the Access Key ID and Secret Access Key for a given profile, run the following, where `[profile]` is replaced with the name of the profile you want to use:

```bash
 aws configure get aws_access_key_id --profile [profile]
 aws configure get aws_secret_access_key --profile [profile]
```


![](../../assets/getting-started/deploying-to-aws/aws_25.gif)


## Register a domain

### Purchase a domain

You can buy domains in many places, but there is some convenience to doing it through AWS itself, which is reasonably priced:

![](../../assets/getting-started/deploying-to-aws/DomainPurchase.png)

Cheaper domains on AWS currently cost around $12/yr, but if you would like a trendier domain, you can expect to pay more. Students may be able to get a free domain through [NameCheap for Education](https://nc.me/).

### Set up an SSL certificate

In order to have encryption&mdash;which you want!&mdash;you need a certificate. You can get this for free through AWS, though it's particularly easy to set this up if you registered your domain through AWS as well:

1. First, make sure you are in the US-East-1 zone. \([This matters](https://medium.com/dailyjs/a-guide-to-deploying-your-react-app-with-aws-s3-including-https-a-custom-domain-a-cdn-and-58245251f081).\)
2. In the AWS Certificate Manager, select "Provision Certificate"
3. Request a public certificate.
4. Enter two your domain preceded by an `*` \(thus 'gameswithwords.org' would be entered as `*.gameswithwords.org`\).
5. If you registered your domain with AWS, use DNS validation. Otherwise, follow the instructions.
6. If you used AWS for your domain registration, Skip through the next couple of steps and click "request". If you did not, it may be more complicated. ![](../../assets/getting-started/deploying-to-aws/SSL.mov)
7. If you used AWS for your domain registration, select the certificate from the list of certificates. Scroll down to "Domains" and click "Create records in Route 53". Select the domain from the list.


At this point, you wait for your certificate to be issued. Depending on how you registered your domain, this may take variable amounts of time. For us, it usually only takes a few minutes.

SSL certificates set up outside of AWS [vary in cost](https://qr.ae/pNsljr), but start around $8/year.


## DockerHub

[Create a DockerHub account](https://hub.docker.com/) if you haven't already. Then tell Pushkin what your DockerHub ID is by running:

```bash
 pushkin setDockerHub
```

You can change your ID at any point by re-running this command.


## Initializing AWS deploy

Run:

```bash
 pushkin aws init
```

You should be asked to name your project, to enter the aws profile you want to use (usually just "default"), choose a security certificate, and choose a domain name. In the latter two cases, the certificate and domain you created in the steps above should be available as options (if not, check that you completed those steps and can see the resources in the AWS console).

It usually takes 5-10 minutes for the program to complete. It tends to stick at "Finished syncing files" and "Creating ECS tasks," although the exact location could change in future versions. When the program successfully completes, you should be able to navigate to your website at your chosen domain.

### What do I do if aws init crashes?

Deploying to AWS is very complicated. Sometimes, it will fail. Try debugging by doing the following in the following order:

1. Try rerunning `pushkin aws init`.
2. Try deleting your deploy (` pushkin aws armageddon`) and then running (` pushkin aws init --force`). The `--force` tag insures that any local aws config information is reset.
3. Ask for help on the [Pushkin forum](https://github.com/pushkin-consortium/pushkin/discussions). Post ALL of the output from your run of aws init.

### Deleting your AWS deploy

AWS will charge you for services you have running. If you are just doing a test site, you may want to delete it afterwards to minimize charges. Run:

```bash
 pushkin aws armageddon
```

When it completes, Armageddon will list remaining services that it hasn't deleted. Armageddon is usually unable to delete everything the first time. This is certain services can't be deleted until other services have finished deleting. You will usually see an error message. Wait a few minutes and run `pushkin aws armageddon`. The second time should be the charm. If you are still having problems, see [deleting through the console](../../advanced/deploying/awsDeletion.md).

**To get the latest news and updates on Pushkin, sign up for our newsletter** [**here.**](https://groups.google.com/g/pushkinjs)


## View Your Data

After you have deployed to AWS, you will want to view your data. 

An introduction to viewing your database with a Postgres manager is given in the [Quickstart](../../getting-started/quickstart/README.md#viewing-your-database-with-a-postgres-manager). Start there for information about how to download and install [pgAdmin](https://www.pgadmin.org/download/) and how to view your data when testing locally.

This tutorial will cover how to view your data from an AWS deployment. 

### Setup

1. Make sure your site has successfully been deployed using AWS. 
2. Open the `pushkin.yaml` for your site in a text editor.
3. Start pgAdmin, which will open in your browser. 

### Add a new server

By default, a database called *Main* is created when you deploy to AWS. Find this in your `pushkin.yaml`, which should look something like this:

```yaml
experimentsDir: experiments
coreDir: pushkin
DockerHubID: yourdockerhubid
databases:
  localtestdb:
    user: postgres
    pass: example
    url: test_db
    name: test_db
    host: localhost
info:
  rootDomain: mydomain.com
  whoAmI: Citizen Science Website
  hashtags: 'science, learn'
  email: me@mydomain.com
  shortName: CSW
  projName: myproject
  awsName: myproject4c2da3b2-d5dc-4414-9d1f-9b30031333bb
addons:
  useForum: false
  useAuth: true
  authDomain: <YOUR_AUTH0_DOMAIN>
  authClientID: <YOUR_AUTH0_CLIENT_ID>
salt: abc123
fc:
  popup: false
productionDBs:
  Main:
    type: Main
    name: myprojectMain
    host: myprojectmain.c3iwcrbpuehx.us-east-1.rds.amazonaws.com
    user: postgres
    pass: '0.9073399739822692'
    port: 5432
  Transaction:
    type: Transaction
    name: myprojectTransaction
    host: myprojecttransaction.c3iwcrbpuehx.us-east-1.rds.amazonaws.com
    user: postgres
    pass: '0.8091098674547545'
    port: 5432
```

Under `productionDBs`, find your `Main` database. You will need information from this section to complete the following steps:

1. In the pgAdmin dashboard, under the *Quick Links*, click **Add New Server**.
2. You can set the name of the server to anything, for example `Pushkin AWS Deploy`. 
3. Then move to the *Connection* tab and set **Host name/address** to `host` as it is specified in your `pushkin.yaml`. In the example above, it would be: `myprojectmain.c3iwcrbpuehx.us-east-1.rds.amazonaws.com`. 
4. Set the password to the your randomly generated password&mdash;`0.9073399739822692` in the above example.
5. Click **Save** and your *Pushkin AWS Deploy* server should appear in the left sidebar.

### View your data

To view your data tables, navigate to the left sidebar:

1. Click to expand your *Pushkin AWS Deploy* server.
2. Select **myprojectMain** under *Databases*. 
3. Select **Schemas**, which will also open its subitem **public**. 
4. Under **public**, choose **Tables**.

By default, you should have 5 tables: `knex_migrations`, `knex_migrations_lock`, `pushkin_userMeta`, `pushkin_userResults`, and `pushkin_users`. You should also have one table for each experiment. If your experiment is called `mind`, you should have `mind_stimulusResponses`. 

To view a given table, right-click on it, hover over *View/Edit Data*, and click on **All Rows**, which will then appear in a new pgAdmin tab.

For more information on how to use pgAdmin, you can read their documentation [here](https://www.pgadmin.org/docs/).
