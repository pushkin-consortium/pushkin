# Configure the AWS CLI and ECS CLIs

## AWS CLI

[Configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) the AWS CLI. 

**Note**: When configuring AWS, be sure to specify `json` as your default output format:

```bash
$ aws configure
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```
## ECS CLI

**Note**: In configuring the ECS CLI, you'll need the AWS profile name you are using, as well as the related Access Key ID and Secret Access Key. If you can't remember the name of your profile, you can get a list of active profiles on your computer using:

```bash
$ aws configure list-profiles
```

To see the Access Key ID and Secret Access Key for a given profile, run the following, where `[profile]` is replaced with the name of the profile you want to use:

```bash
$ aws configure get aws_access_key_id --profile [profile]
$ aws configure get aws_secret_access_key --profile [profile]
```

