# Install Required Software

## Postgres Manager

Install a Postgres manager such as [SQLPro for Postgres](https://macpostgresclient.com/), which costs $7.99/month after the free trial ends. Free and open-source managers are also available \(e.g., [pgadmin](https://www.pgadmin.org/download/)). Or, if you become very comfortable connecting to postgres through the command line \(not documented in this tutorial\), then you may not need a Postgres manager.


## AWS CLI

[Install](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) the AWS CLI. Install the version for your operating system, not the Docker image.

Configuration steps will follow on the [next page](./configure-aws-and-ecs-clis.md).

## ECS CLI

Install [ECS CLI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ECS_CLI_installation.html). (Do only the first page. There's no need follow the steps on the 'configuration' page. The Pushkin CLI will handle this for you.)

