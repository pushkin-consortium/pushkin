# AWS Configuration System

**Updated:** 2026-06-08\
**Status:** ✅ Implemented

## Three-Layer Model

AWS deployment configuration is split across three layers by audience and purpose:

| Layer | File | Who changes it |
|---|---|---|
| **Prompted** | CLI flow (`aws init`) | Every user — these must be user-specific |
| **User config** | `aws-deploy.yaml` | Users tuning their deployment |
| **Operational constants** | `constants.js` | Devs, or power users debugging timeouts |

There is also a fourth file, `aws-templates.js`, which holds the full AWS SDK request templates (the "base objects" that get cloned and overridden at deployment time). Users never edit this.

---

## Prompted Configuration (`aws init` flow)

These are gathered interactively during `pushkin aws init` because they must be user-specific:

- **IAM profile** — the AWS profile name for managing resources
- **Project name** — unique identifier for all AWS resources
- **DockerHub ID** — for pushing/pulling worker images
- **Custom domain** (optional)
- **SSL certificate** (if custom domain)

---

## User Configuration (`aws-deploy.yaml`)

Copy `packages/pushkin-cli/aws-deploy.yaml` to your project root and edit what you need. All fields are optional — defaults are used for anything not specified.

### Current schema

```yaml
region: us-east-1

cloudfront:
  priceClass: PriceClass_100   # PriceClass_100 (cheapest, N.America+EU) | PriceClass_200 | PriceClass_All
  extraConfig: {}              # raw CloudFront DistributionConfig fields (AWS SDK names)

ecs:
  api:
    memory: 512                # MB (hard limit)
    memoryReservation: 256     # MB (soft limit)
    cpu: 256                   # CPU units (1024 = 1 vCPU)
  worker:
    memory: 512
    memoryReservation: 256
    cpu: 256
  rabbitmq:
    memory: 512
    memoryReservation: 256
    cpu: 256
  extraConfig: {}              # raw ECS task fields applied to all tasks

rds:
  instanceClass: db.t3.micro
  allocatedStorage: 20         # GB
  maxAllocatedStorage: 100     # GB
  backupRetentionPeriod: 7     # days
  multiAZ: false               # set true for production — enables failover but doubles RDS cost
  extraConfig: {}              # raw RDS CreateDBInstance fields (AWS SDK names)

autoscaling:
  minSize: 2
  maxSize: 10
  desiredCapacity: 2
  alarms:
    cpu:
      threshold: 75            # percent
      evaluationPeriods: 2
    memory:
      threshold: 75
      evaluationPeriods: 2
    rds:
      writeLatency: 100        # ms
      evaluationPeriods: 2

security:
  enableWAF: true
  adminIPWhitelist: []         # CIDR blocks

monitoring:
  logRetentionDays: 7
  alarmEmail: null

tagging:
  projectTagKey: PUSHKIN       # AWS tag key for all Pushkin-managed resources
```

### `extraConfig` escape hatch

Each of `cloudfront`, `ecs`, and `rds` has an `extraConfig` field for passing raw AWS SDK parameters that aren't listed above. Use AWS SDK field names exactly:

```yaml
rds:
  instanceClass: db.t4g.medium
  multiAZ: true
  extraConfig:
    StorageType: io1            # AWS SDK name for RDS storage type
    Iops: 3000
```

```yaml
ecs:
  api:
    memory: 2048
    cpu: 1024
  extraConfig:
    networkMode: awsvpc         # applies to all ECS tasks
```

---

## Operational Constants (`constants.js`)

Timeouts, tag keys, and internal batch sizes live here. These are Pushkin's sensible defaults — edit directly if an AWS operation keeps timing out or you need to tune a specific waiter.

```js
// constants.js
export const TIMEOUTS = {
  cloudfront: { maxWaitTime: 1800, checkInterval: 30, oacDeletion: { ... } },
  rds: { availability: { ... }, deletion: { ... }, ... },
  ecs: { tasksStopped: { ... }, servicesDeletion: { ... } },
  elb: { listenerDeletion: { ... } },
  route53: { recordSetDeletion: { ... } },
  cloudformation: { stackDeletion: { ... } },
};

export const S3_UPLOAD_BATCH_SIZE = 10;
```

---

## AWS Templates (`aws-templates.js`)

Holds the full AWS SDK request objects with `FUBAR` placeholders replaced at runtime. These are Pushkin's architectural decisions:

- `Engine: "postgres"` — Pushkin only supports Postgres
- `EnableIAMDatabaseAuthentication: true`
- `StorageEncrypted: true`
- `StorageType: "gp3"`
- `PubliclyAccessible: false` — RDS is VPC-internal
- `HttpVersion: "http2and3"`, `Compress: true` — CloudFront performance defaults
- `MinimumProtocolVersion: "TLSv1.2_2021"` — security baseline

---

## How the Layers Merge

At deployment, service code merges all three layers:

```js
// rds.js — example of the merge pattern
const myDbConfig = structuredClone(dbConfig);       // 1. start from template
myDbConfig.DBInstanceClass = rdsConfig.instanceClass; // 2. apply named user config
myDbConfig.MultiAZ = rdsConfig.multiAZ;
Object.assign(myDbConfig, rdsConfig.extraConfig);   // 3. apply user extraConfig passthrough
```

---

## What's Wired Up

| Config field | Applied in |
|---|---|
| `rds.*` (instanceClass, storage, backup, multiAZ) | `services/rds.js` |
| `rds.extraConfig` | `services/rds.js` |
| `ecs.{api,worker,rabbitmq}.memory` | `services/ecs/environment.js` |
| `ecs.extraConfig` | `services/ecs/environment.js` |
| `cloudfront.priceClass` | `services/cloudfront/distributions.js` |
| `cloudfront.extraConfig` | `services/cloudfront/distributions.js` |
| `monitoring.logRetentionDays` | `services/monitoring.js` |
| `tagging.projectTagKey` | `constants.js` → all services |

---

## Remaining Work

1. **Wire up `monitoring.alarmEmail`** — requires SNS topic creation (not yet implemented). The CloudWatch alarm templates have `AlarmActions: ["FUBAR"]` placeholders waiting for an SNS topic ARN.
2. **Region as a prompted field** — currently hardcoded to `us-east-1` in `constants.js`; should be prompted during `aws init` for users deploying outside the US. Significant refactor — touches constants, all service files, and the init flow.

## Related Files

- Template: `packages/pushkin-cli/aws-deploy.yaml`
- User config loader: `src/commands/aws/utils/aws-config.js`
- Operational constants: `src/commands/aws/constants.js`
- AWS API templates: `src/commands/aws/aws-templates.js`
