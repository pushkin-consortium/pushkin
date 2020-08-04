# Deploying to AWS

## Requirements

1. Finished the [Quickstart](https://languagelearninglab.gitbook.io/pushkin/getting-started/quickstart)
2. Install a Postgres manager \(ex: [pgadmin](https://www.pgadmin.org/download/) or [SQLPro for Postgres](https://macpostgresclient.com/)\), or get very comfortable connecting to postgres through the command line \(not documented in this tutorial\).
3. \(Must do approx. 24 hrs in advance:\) Create an [Amazon Web Services](https://aws.amazon.com/free/?sc_channel=PS&sc_campaign=acquisition_US&sc_publisher=google&sc_medium=cloud_computing_b&sc_content=aws_url_e_control_q32016&sc_detail=amazon.%20web%20services&sc_category=cloud_computing&sc_segment=188908164670&sc_matchtype=e&sc_country=US&s_kwcid=AL!4422!3!188908164670!e!!g!!amazon.%20web%20services&ef_id=WUGhAAAAAHs2P1qP:20171016145411:s.) account.
4. [Install](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) and [configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) the AWS CLI.

**Note**: When configuring AWS, be sure to specify `json` as your default output format:

```bash
$ aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

1. Install [ECS CLI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html). \(Do only the first page. There's no need to configure to the 'configuration' page. The pushkin cli will handle this for you.

**Note**: In configuring the ECS CLI, you'll need the AWS profile name you are using, as well as the related Access Key ID and Secret Access Key. If you can't remember the name of your profile, you can get a list of active profiles on your computer using:

```bash
$ aws configure list-profiles
```

To see the Access Key ID and Secret Access Key for a given profile, run:

```bash
$ get configure get aws_access_key_id --profile [profile]
$ get configure get aws_secret_access_key --profile [profile]
```

where `[profile]` is replaced with the name of the profile you want to use.

1. \[Create a DockerHub account\] \([https://id.docker.com](https://id.docker.com)\) if you haven't already. Then tell pushkin what your DockerHub ID is by running:

```bash
$ pushkin setDockerHub
```

You can change your ID at any point by re-running this command.

## Domain registration

### Purchase a domain

You can buy domains many places, but there is some convenience to doing it through AWS itself, which is reasonably priced:

![](../.gitbook/assets/DomainPurchase.png)

### Set up an SSL certificate

In order to have encryption&mdash;which you want!&mdash;you need a certificate. You can get this for free through AWS, though it's particularly easy to set this up if you registered your domain through AWS as well:

1. First make sure you are in the US-East-1 zone. \(We [read that this matters](https://medium.com/dailyjs/a-guide-to-deploying-your-react-app-with-aws-s3-including-https-a-custom-domain-a-cdn-and-58245251f081), though we haven't confirmed this.\)
2. In the AWS Certificate Manager, select "Provision Certificate"
3. Request a public certificate.
4. Enter your domain preceded by an `*` \(thus 'gameswithwords.org' would be entered as `*.gameswithwords.org`\).
5. If you registered your domain with AWS, use DNS validation. Otherwise, follow the instructions.
6. Skip through the next couple steps, then create a CNAME record. This is simple if you used AWS for your domain registration; otherwise, follow the instructions. ![](../.gitbook/assets/SSL.mov)

At this point, you wait for your certificate to be issued. Depending on how you registered your domain, this may take variable amounts of time. For us, it usually only takes a few minutes.

...To be continued

