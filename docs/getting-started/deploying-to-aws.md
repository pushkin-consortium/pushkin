# Deploying to AWS

---

## 🚨 Important Note
> **Due to an update in AWS resources, the CLI-based AWS deploy does not currently work and is being updated. In the meantime, you can still manually deploy to AWS.**

---
## Requirements

* Finished the [Quickstart](https://languagelearninglab.gitbook.io/pushkin/getting-started/quickstart)
* Install a Postgres manager such as [SQLPro for Postgres](https://macpostgresclient.com/), which costs $7.99/month after the free trial ends. Free and open-source managers are also available \(e.g., [pgadmin](https://www.pgadmin.org/download/)). Or, if you become very comfortable connecting to postgres through the command line \(not documented in this tutorial\), then you may not need a Postgres manager.
* \(Must be done approximately 24 hours in advance:\) Create an [Amazon Web Services](https://aws.amazon.com/free/?sc_channel=PS&sc_campaign=acquisition_US&sc_publisher=google&sc_medium=cloud_computing_b&sc_content=aws_url_e_control_q32016&sc_detail=amazon.%20web%20services&sc_category=cloud_computing&sc_segment=188908164670&sc_matchtype=e&sc_country=US&s_kwcid=AL!4422!3!188908164670!e!!g!!amazon.%20web%20services&ef_id=WUGhAAAAAHs2P1qP:20171016145411:s.) account.
* [Install](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) and [configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) the AWS CLI.

**Note**: When configuring AWS, be sure to specify `json` as your default output format:

```bash
 aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

* Install [ECS CLI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html). \(Do only the first page. There's no need to configure to the 'configuration' page. The Pushkin CLI will handle this for you.)

<!---
**Note**: In configuring the ECS CLI, you'll need the AWS profile name you are using, as well as the related Access Key ID and Secret Access Key. If you can't remember the name of your profile, you can get a list of active profiles on your computer using:

```bash
 aws configure list-profiles
```

To see the Access Key ID and Secret Access Key for a given profile, run the following, where `[profile]` is replaced with the name of the profile you want to use:

```bash
 get configure get aws_access_key_id --profile [profile]
 get configure get aws_secret_access_key --profile [profile]
```
--->

* [Create a DockerHub account]([https://id.docker.com](https://id.docker.com)) if you haven't already. Then tell Pushkin what your DockerHub ID is by running:

```bash
 pushkin setDockerHub
```

You can change your ID at any point by re-running this command.

## Domain registration

### Purchase a domain

You can buy domains many places, but there is some convenience to doing it through AWS itself, which is reasonably priced:

![](../assets/DomainPurchase.png)

Cheaper domains on AWS currently cost around $12/yr, but if you would like a trendier domain, you can expect to pay more. Students may be able to get a free domain through [NameCheap for Education](https://nc.me/).

### Set up an SSL certificate

In order to have encryption&mdash;which you want!&mdash;you need a certificate. You can get this for free through AWS, though it's particularly easy to set this up if you registered your domain through AWS as well:

1. First, make sure you are in the US-East-1 zone. \(We [read that this matters](https://medium.com/dailyjs/a-guide-to-deploying-your-react-app-with-aws-s3-including-https-a-custom-domain-a-cdn-and-58245251f081), though we haven't confirmed this.\)
2. In the AWS Certificate Manager, select "Provision Certificate"
3. Request a public certificate.
4. Enter (1) your domain and (2) your domain preceded by `*.`. Thus for 'gameswithwords.org', you would enter `gameswithwords.org` and `*.gameswithwords.org`\).
5. If you registered your domain with AWS, use DNS validation. Otherwise, follow the instructions.
6. Skip through the next couple steps, then create a CNAME record. This is simple if you used AWS for your domain registration; otherwise, follow the instructions. ![](../..../../assets/SSL.mov)

At this point, you wait for your certificate to be issued. Depending on how you registered your domain, this may take variable amounts of time. For us, it usually only takes a few minutes.

SSL certificates set up outside of AWS [vary in cost](https://qr.ae/pNsljr), but start around $8/year.

## Initializing AWS deploy

Run:

```bash
 pushkin aws init
```

You should be asked to name your project, to enter the aws profile you want to use, choose a security certificate, and choose a domain name. In the latter two cases, the certificate and domain you created in the steps above should be available as options (if not, check that you completed those steps and can see the resources in the AWS console).

It usually takes 5-10 minutes for the program to complete. It tends to stick at "Finished syncing files" and "Creating ECS tasks," although the exact location could change in future versions. When the program successfully completes, you should be able to navigate to your website at your chosen domain.

### What do I do if aws init crashes?

Deploying to AWS is very complicated. Sometimes, it will fail. Try debugging by doing the following in the following order:

1. Try rerunning `pushkin aws init`.
2. Try deleting your deploy (` pushkin aws armageddon`) and then running (` pushkin aws init --force`). The `--force` tag insures that any local aws config information is reset.
3. Ask for help on the [Pushkin forum](https://github.com/pushkin-consortium/pushkin/discussions). Post ALL of the output from your run of aws init.

## Deleting your AWS deploy

AWS will charge you for services you have running. If you are just doing a test site, you may want to delete it afterwards to minimize charges. Run:

```bash
 pushkin aws armageddon
```

When it completes, Armageddon will list remaining services that it hasn't deleted. Armageddon is usually unable to delete everything the first time. This is certain services can't be deleted until other services have finished deleting. You will usually see an error message. Wait a few minutes and run `pushkin aws armageddon`. The second time should be the charm. If you are still having problems, see [deleting through the console](../advanced/deploying/awsDeletion.md#Console).
