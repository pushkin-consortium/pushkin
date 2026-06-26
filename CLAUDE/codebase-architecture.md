# Pushkin Codebase Architecture

**Last updated:** 2026-05-28

## Local vs Production Overview

| Layer                | Production                           | Local dev                         |
| -------------------- | ------------------------------------ | --------------------------------- |
| Frontend             | Build → static files → S3/CloudFront | webpack dev server (Node process) |
| API/Workers/RabbitMQ | Docker containers on ECS Fargate     | Docker containers via Compose     |
| Databases            | Postgres on RDS (no Docker)          | Postgres in a Docker container    |

- **Docker images** are blueprints; **containers** are the running instances. Fargate pulls images from DockerHub and runs them as live containers — those containers ARE the workers.
- **Postgres** is the database software. RDS is AWS running Postgres as a managed service (no Docker). Locally, the `postgres:11` Docker image provides Postgres without a system install.
- **Frontend** is never Docker — static files in production (S3/CloudFront), dev server locally.

---

## Project Overview

- **Purpose**: Online psychology experiment platform using jsPsych
- **Target**: Researchers deploying "online laboratory" behavioral experiments to AWS
- **Status**: v4.2 — AWS deployment fully migrated from AWS CLI to AWS SDK (Fargate)
- **Main Entry**: `packages/pushkin-cli/src/index.js` (Commander.js CLI structure)

---

## AWS Command Architecture

### Folder Layout

```
packages/pushkin-cli/src/commands/aws/
  index.js               ← Thin orchestrator (~476 lines); user-facing commands
  awsConfigs.js          ← Static AWS config objects (CloudFront, RDS, WAF, alarms)
  aws-deploy.yaml        ← Tunable deployment parameters (timeouts, intervals)
  constants.js           ← Region, exec helper
  /phases/               ← Orchestration modules (one per deployment concern)
    setup.js             ← Phase 1: IAM verification, config loading
    user-input.js        ← Phase 2: inquirer prompts (domain, SSL certificate)
    infrastructure.js    ← Phase 3: RDS, security groups, front-end build
    compute.js           ← Phase 4: ECS cluster, load balancer, task definitions
    database-setup.js    ← Phase 5: DB migrations and transaction tables
    deployment.js        ← Phase 6: Docker publish, S3/CloudFront deploy, Route53
    init.js              ← deployFrontEnd() — S3 + CloudFront provisioning
    cleanup.js           ← Armageddon/kill resource deletion
    status.js            ← pushkin aws status (project-scoped resource health)
    /__tests__/          ← Unit test directory (ready, not yet populated)
  /services/             ← AWS SDK wrappers (pure data/AWS calls, no prompts)
    cloudfront.js        ← CloudFront distribution management + waiters
    elb.js               ← Load balancer, target groups, listeners
    iam.js               ← IAM roles and policies
    monitoring.js        ← CloudWatch log groups; listCertificates() (data only)
    rds.js               ← RDS database CRUD + waiters
    route53.js           ← DNS records (hosted zone lookup, record sets)
    s3.js                ← S3 bucket CRUD, file sync, front-end build
    security.js          ← Security groups (EC2), WAF Web ACL, IAM credential check
    /ecs/
      clusters.js        ← ECS cluster create/delete
      environment.js     ← Task definition builders (rabbit, api, worker)
      services.js        ← ECS service create/update/delete + waiter
      tasks.js           ← Full ECS task setup (IAM roles, task defs, services)
  /utils/                ← AWS-specific utilities
    aws-client-factory.js  ← Unified AWS SDK client creation with IAM profiles
    aws-config.js          ← Load aws-deploy.yaml
    aws-resources.js       ← Read/write awsResources.js (generated resource IDs)
    retry.js               ← Generic retry helper
```

### User-Facing Commands

| Command                  | Handler             | Description                     |
| ------------------------ | ------------------- | ------------------------------- |
| `pushkin aws init`       | `awsInit()`         | Full deployment (6 phases)      |
| `pushkin aws armageddon` | `awsArmageddon()`   | Delete all resources            |
| `pushkin aws list`       | `awsList()`         | List all account resources      |
| `pushkin aws status`     | `awsStatus()`       | Project-scoped resource health  |
| `pushkin aws autoscale`  | `createAutoScale()` | CloudWatch alarms + autoscaling |

### awsInit() Phase Flow

```
Phase 1: initializeDeployment()   — verify IAM, load pushkin.yaml
Phase 2: gatherUserInput()        — certificate + domain prompts
         updateDeploymentConfig() — write domain/bucket to pushkin.yaml
Phase 3: provisionInfrastructure()— security groups, RDS (parallel), front-end build
Phase 4: setupCompute()           — ECS cluster + load balancer (awaits DBs)
Phase 5: setupDatabases()         — migrations (parallel with compute)
Phase 6: deployApplication()      — Docker push + CloudFront deploy + Route53
         await all phase promises
```

### Key Design Principles

- **Services are pure AWS**: no inquirer, no user prompts — return data or throw
- **Phases own UX**: orchestration, logging, and prompts live in phases/
- **createWaiter** from `@smithy/util-waiter` replaces all polling loops
- **structuredClone** replaces JSON.parse(JSON.stringify()) for deep cloning
- **AWSClientFactory** centralizes IAM profile injection into every SDK client

---

## Broader CLI Architecture

```
packages/pushkin-cli/src/
  index.js                   ← Commander.js entry point
  /commands/
    /aws/                    ← (see above)
    /experiments/index.js    ← Install/remove experiment templates
    /prep/index.js           ← Docker build prep (~715 lines, future refactor)
    /setupdb/index.js        ← DB migrations (~530 lines, future refactor)
    /sites/index.js          ← Install site templates
  /utils/
    docker.js                ← Docker build/publish helpers
    file.js                  ← Unified file I/O (readJSON, walkDirectory, etc.)
    package-manager.js       ← yarn/npm detection
    pushkin-config.js        ← pushkin.yaml load/save (synchronous)
```

### Important Config Files (runtime)

| File              | Location     | Purpose                             |
| ----------------- | ------------ | ----------------------------------- |
| `pushkin.yaml`    | project root | Site config, DB credentials, domain |
| `awsResources.js` | `.pushkin/`  | Generated AWS resource IDs/ARNs     |
| `aws-deploy.yaml` | CLI package  | Tunable timeouts, project tag key   |
| `~/.aws/config`   | system       | IAM profiles (loaded via fromIni)   |

---

## AWS Services Used

| Service         | SDK Package                                 | Purpose                                     |
| --------------- | ------------------------------------------- | ------------------------------------------- |
| RDS             | `@aws-sdk/client-rds`                       | PostgreSQL (Main + Transaction DBs)         |
| ECS/Fargate     | `@aws-sdk/client-ecs`                       | API, RabbitMQ, experiment workers           |
| CloudFront      | `@aws-sdk/client-cloudfront`                | Frontend CDN + HTTPS                        |
| ELBv2           | `@aws-sdk/client-elastic-load-balancing-v2` | Load balancer for API                       |
| S3              | `@aws-sdk/client-s3`                        | Frontend static hosting                     |
| Route53         | `@aws-sdk/client-route-53`                  | DNS records                                 |
| ACM             | `@aws-sdk/client-acm`                       | SSL certificates                            |
| WAFv2           | `@aws-sdk/client-wafv2`                     | CloudFront Web ACL                          |
| EC2             | `@aws-sdk/client-ec2`                       | Security groups, VPC, subnets               |
| IAM             | `@aws-sdk/client-iam`                       | ECS task execution role                     |
| STS             | `@aws-sdk/client-sts`                       | Credential verification                     |
| CloudWatch Logs | `@aws-sdk/client-cloudwatch-logs`           | ECS log groups                              |
| SNS/CloudWatch  | AWS CLI (legacy)                            | Alarms + autoscaling (createAutoScale only) |

---

## Known Remaining Issues / Future Work

### createAutoScale() still uses AWS CLI

`createAutoScale()` in `index.js` calls `exec('aws sns ...')`, `exec('aws cloudwatch ...')`,
and `exec('aws autoscaling ...')`. All other commands are pure SDK. This function is rarely
used and is a candidate for SDK migration in a future pass.

### Large files not yet refactored

- `commands/prep/index.js` (~715 lines) — planned for v5
- `commands/setupdb/index.js` (~530 lines) — planned for v5
- `services/ecs/tasks.js` (~large) — could be split further

### TODO: killize

Several cleanup functions have `// TODO: killize` comments indicating incomplete
project-specific deletion filtering (kill mode vs armageddon mode).

### Testing

`phases/__tests__/` exists but is empty. Unit tests for phase modules are the
highest-priority next step before merging this branch.

### status.js placement

`phases/status.js` is a pure service (AWS API calls only, no orchestration). It was placed
in `phases/` during initial creation but logically belongs in `services/`. Deferred.
