# Configure the AWS CLI and ECS CLIs

## AWS CLI

[Configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) the AWS CLI. (The main steps are reproduced below for your convenience.)

First, you will need to generate access keys. Best practices dictate that you [create an IAM Admin User and Group](https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-started_create-admin-group.html) rather than creating root access keys. 

To create an IAM user, sign into [Identity and Access Management](https://console.aws.amazon.com/iam/) in your AWS console using your root user credentials.

![](../../.gitbook/assets/aws_8.gif)

Navigate to *My Account* and enable access to billing data for IAM users.

![](../../.gitbook/assets/aws_10.gif)

Navigate back to [Identity and Access Management](https://console.aws.amazon.com/iam/), select *Users* in the left sidebar and click **Add user**. 

![](../../.gitbook/assets/aws_12.gif)

Set username as `Administrator` and click *Next: Permissions*.

![](../../.gitbook/assets/aws_13.gif)

Under the *Add user to group* tab, select **Create group**. Call the group name `Administrators` and check the *AdministratorAccess* job function in the list of policies. Then click *Create group* to continue.

![](../../.gitbook/assets/aws_14.gif)

Click through the *Tags* page, review your settings and click **Create user**. Download the CSV with login information.

![](../../.gitbook/assets/aws_15.gif)

Return to the *Users* page and select the **Security credentials** tab for the `Administrator` user you just created. 

![](../../.gitbook/assets/aws_16.gif)

Under *Access keys*, click **Create access keys**.

![](../../.gitbook/assets/aws_17.gif)


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

![](../../.gitbook/assets/aws_24.gif)


## ECS CLI

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


![](../../.gitbook/assets/aws_25.gif)
