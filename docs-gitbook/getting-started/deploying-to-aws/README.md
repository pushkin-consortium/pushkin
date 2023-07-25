# Deploying to AWS

Deploy your basic Pushkin site and experiments to Amazon Web Services.

## Prerequisites

Before you begin, make sure your have:
 
1. Finished the [Quickstart](../quickstart/README.md), including [installing a Postgres manager](../quickstart/README.md##viewing-your-database-with-a-postgres-manager). 
2. Created an [Amazon Web Services](https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc) account. (**Note:** This must be done approximately 24 hours in advance of when you would like to follow this tutorial.) 

## AWS Deployment Steps

* [Install required software.](./install-required-software.md)
* [Configure the AWS and ECS CLIs.](./configure-aws-and-ecs-clis.md)
* [Register a domain.](./domain-registration.md)
* [Set up DockerHub.](./dockerhub.md)
* [Initialize AWS Deploy](./initializing-aws-deploy.md)




<!---
1. \[Create a DockerHub account\] \([https://id.docker.com](https://id.docker.com)\) if you haven't already. Then tell Pushkin what your DockerHub ID is by running:

```bash
 pushkin setDockerHub
```

You can change your ID at any point by re-running this command.
--->




