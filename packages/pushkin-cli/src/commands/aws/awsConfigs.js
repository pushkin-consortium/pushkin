/**
 * AWS Infrastructure Config Templates
 *
 * This file exports config objects used by aws/index.js to provision AWS resources.
 * All "FUBAR" placeholder values are replaced during deployment.
 *
 * Architecture Overview:
 * Front-end (Static):
 * CloudFront (CDN) → S3 bucket: serves static (built) React front-end
 * └─ Protected by WAF: Web Application Firewall
 *
 * Back-end (Containerized on ECS)
 * ALB (Application Load Balancer) → ECS Cluster (host networking, single EC2 instance)
 * └─ API container ←→ RabbitMQ container ←→ Worker containers (one per experiment)
 * └─ All connect to RDS PostgreSQL (Main DB + Transaction DB)
 *
 * Communication Flow:
 * User → CloudFront → React app → ALB → API → RabbitMQ → Workers → RDS
 *
 * Network Mode: Host networking (all containers share localhost on same EC2 instance)
 * @see index.js for deployment logic that uses these configs
 */

import { loadAwsConfig } from "./utils/aws-config.js";

const awsConfig = loadAwsConfig();
const PROJECT_TAG_KEY = awsConfig.tagging.projectTagKey;

// FRONT-END DELIVERY
/**
 * For creating ACL that protects Pushkin site from common web exploits and malicious traffic by
 * controlling access to the CloudFront distribution.
 * @see https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html
 * @type {object} AWS WAFv2 WebACL config
 */
export const pushkinACL = {
  Name: "pushkinACL",
  Scope: "CLOUDFRONT",
  DefaultAction: {
    Allow: {},
  },
  Description: "Default ACL for Pushkin",
  Rules: [
    {
      Name: "AWS-AWSManagedRulesAmazonIpReputationList",
      Priority: 0,
      Statement: {
        ManagedRuleGroupStatement: {
          VendorName: "AWS",
          Name: "AWSManagedRulesAmazonIpReputationList",
        },
      },
      OverrideAction: {
        None: {},
      },
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: "AWS-AWSManagedRulesAmazonIpReputationList",
      },
    },
    {
      Name: "AWS-AWSManagedRulesCommonRuleSet",
      Priority: 1,
      Statement: {
        ManagedRuleGroupStatement: {
          VendorName: "AWS",
          Name: "AWSManagedRulesCommonRuleSet",
        },
      },
      OverrideAction: {
        None: {},
      },
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: "AWS-AWSManagedRulesCommonRuleSet",
      },
    },
    {
      Name: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
      Priority: 2,
      Statement: {
        ManagedRuleGroupStatement: {
          VendorName: "AWS",
          Name: "AWSManagedRulesKnownBadInputsRuleSet",
        },
      },
      OverrideAction: {
        None: {},
      },
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: "AWS-AWSManagedRulesKnownBadInputsRuleSet",
      },
    },
  ],
  VisibilityConfig: {
    SampledRequestsEnabled: true,
    CloudWatchMetricsEnabled: true,
    MetricName: "pushkinACL",
  },
};

/**
 * Allows CloudFront to access objects in the S3 bucket.
 * This implements the "Origin Access Control" (OAC) security model where CloudFront
 * is the only entity allowed to serve files from the S3 bucket, preventing direct public access.
 * @type {object} S3 Bucket Policy document (IAM policy format)
 */
export const policy = {
  Version: "2008-10-17",
  Id: "PolicyForCloudFrontPrivateContent",
  Statement: [
    {
      Sid: "AllowCloudFrontServicePrincipal",
      Effect: "Allow",
      Principal: {
        Service: "cloudfront.amazonaws.com",
      },
      Action: "s3:GetObject",
      Resource: "FUBAR", // → S3 bucket full ARN
      Condition: {
        StringEquals: {
          "AWS:SourceArn": "FUBAR", // → CloudFront distribution ARN
        },
      },
    },
  ],
};

/**
 * Allow web browsers to make cross-origin requests to the S3 bucket.
 * NOTE: Currently unused.
 * @type {object} S3 PutBucketCors config
 */
export const corsPolicy = {
  Bucket: "",
  CORSConfig: {
    CORSRules: [
      {
        AllowedHeaders: ["Authorization"],
        AllowedMethods: ["GET"],
        AllowedOrigins: ["*"],
        MaxAgeSeconds: 3000,
      },
    ],
  },
};

/**
 * Config for OAC that allows only CloudFront to access the S3 bucket, preventing direct
 * public access to the bucket.
 * @type {object} CloudFront CreateOriginAccessControl config
 */
export const OriginAccessControl = {
  Name: "pushkinOAC",
  Description: "Origin Access Control for Pushkin S3 bucket - restricts to CloudFront-only access",
  SigningProtocol: "sigv4",
  SigningBehavior: "always",
  OriginAccessControlOriginType: "s3",
};

/**
 * Config for CloudFront (the CDN for delivering the Pushkin site front-end).
 * @type {object} CloudFront DistributionWithTags config
 */
export const cloudFront = {
  Tags: {
    Items: [
      {
        Key: PROJECT_TAG_KEY,
        Value: PROJECT_TAG_KEY,
      },
    ],
  },
  DistributionConfig: {
    CallerReference: "FUBAR", // → name of S3 bucket
    Aliases: {
      // → root domain, www subdomain
      Quantity: 0,
    },
    DefaultRootObject: "index.html",
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: "FUBAR", // → name of S3 bucket
          DomainName: "FUBAR", // → S3 bucket domain
          OriginPath: "",
          CustomHeaders: {
            Quantity: 0,
          },
          S3OriginConfig: {
            OriginAccessIdentity: "",
          },
          ConnectionAttempts: 3,
          ConnectionTimeout: 10,
          OriginShield: {
            Enabled: false,
          },
          OriginAccessControlId: "FUBAR",
        },
      ],
    },
    OriginGroups: {
      Quantity: 0,
    },
    DefaultCacheBehavior: {
      TargetOriginId: "FUBAR", // → name of S3 bucket
      TrustedSigners: {
        Enabled: false,
        Quantity: 0,
      },
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 2,
        Items: ["HEAD", "GET"],
        CachedMethods: {
          Quantity: 2,
          Items: ["HEAD", "GET"],
        },
      },
      SmoothStreaming: false,
      Compress: true,
      LambdaFunctionAssociations: {
        Quantity: 0,
      },
      FieldLevelEncryptionId: "",
      CachePolicyId: "658327ea-f89d-4fab-a63d-7e88639e58f6",
    },
    CacheBehaviors: {
      Quantity: 0,
    },
    CustomErrorResponses: {
      Quantity: 1,
      Items: [
        {
          ErrorCode: 403,
          ResponsePagePath: "/index.html",
          ResponseCode: "200",
          ErrorCachingMinTTL: 60,
        },
      ],
    },
    Comment: "",
    Logging: {
      Enabled: false,
      IncludeCookies: false,
      Bucket: "",
      Prefix: "",
    },
    PriceClass: "PriceClass_All",
    Enabled: true,
    ViewerCertificate: {
      CloudFrontDefaultCertificate: true,
      MinimumProtocolVersion: "TLSv1",
      CertificateSource: "cloudfront",
    },
    Restrictions: {
      GeoRestriction: {
        RestrictionType: "none",
        Quantity: 0,
      },
    },
    WebACLId: "FUBAR",
    HttpVersion: "http2and3",
    IsIPV6Enabled: true,
    ContinuousDeploymentPolicyId: "",
    Staging: false,
  },
};

// BACK-END CONTAINER CONFIGS
/**
 * Config for Pushkin API server, which handles HTTP requests from the front-end and
 * communicates with experiment workers via RabbitMQ.
 * @type {object} Docker Compose v2 service definition
 */
export const apiTask = {
  version: "2",
  services: {
    api: {
      image: "DOCKERHUB_ID/api:latest",
      mem_limit: "128m",
      environment: {
        AMQP_ADDRESS: "amqp://RABBITMQ_USERNAME:RABBITMQ_PASSWORD@localhost:5672",
        NODE_ENV: "production",
        PORT: 80,
      },
      command: ["bash", "dockerStart.sh"],
      ports: ["80:80/tcp"],
      logging: {
        driver: "awslogs",
        options: {
          "awslogs-group": "FUBAR", // → "ecs/" + project name
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "FUBAR", // → "ecs/api" + project name
        },
      },
    },
  },
};

/**
 * Config for RabbitMQ message queue, which handles asynchronous communication between the
 * API and experiment workers.
 * @type {object} Docker Compose v2 service definition
 */
export const rabbitTask = {
  version: "2",
  services: {
    "message-queue": {
      image: "rabbitmq:3.7-management",
      mem_limit: "512m",
      environment: {
        RABBITMQ_DEFAULT_USER: "RABBITMQ_USERNAME",
        RABBITMQ_DEFAULT_PASS: "RABBITMQ_PASSWORD",
        RABBITMQ_ERLANG_COOKIE: "RABBITMQ_COOKIE",
      },
      ports: ["5672:5672/tcp", "4369:4369/tcp", "15672:15672/tcp", "25672:25672/tcp"],
      logging: {
        driver: "awslogs",
        options: {
          "awslogs-group": "FUBAR", // → "ecs/" + project name
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "FUBAR", // → "ecs/rabbit" + project name
        },
      },
    },
  },
};

/**
 * Config for experiment worker containers.
 * Each experiment gets its own worker that processes experiment-specific tasks.
 * @type {object} Docker Compose v2 service definition template
 */
export const workerTask = {
  version: "2",
  services: {
    EXPERIMENT_NAME: {
      image: "DOCKERHUB_ID/EXPERIMENT_NAME:latest",
      mem_limit: "128m",
      environment: {
        AMQP_ADDRESS: "amqp://RABBITMQ_USERNAME:RABBITMQ_PASSWORD@localhost:5672",
      },
      command: ["bash", "start.sh"],
      logging: {
        driver: "awslogs",
        options: {
          "awslogs-group": "FUBAR", // → "ecs/" + project name
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "FUBAR", // → "ecs/" + worker name + project name
        },
      },
    },
  },
};

// BACK-END DB
/**
 * Config for PostgreSQL RDS (Relational Database Service) for storing experiment data.
 * @type {object} RDS CreateDBInstance config
 */
export const dbConfig = {
  DBName: "FUBAR",
  DBInstanceIdentifier: "FUBAR1234",
  AllocatedStorage: 20,
  DBInstanceClass: "db.t3.micro",
  Engine: "postgres",
  EngineVersion: "17",
  MasterUsername: "postgres",
  VpcSecurityGroupIds: ["FUBAR"], // → 3 security groups: Balancer group, ECS group and RDS group
  MasterUserPassword: "FUBAR",
  BackupRetentionPeriod: 7,
  Port: 5432,
  MultiAZ: true,
  AutoMinorVersionUpgrade: true,
  PubliclyAccessible: true,
  StorageType: "gp2",
  StorageEncrypted: false,
  CopyTagsToSnapshot: true,
  MonitoringInterval: 0,
  EnableIAMDatabaseAuthentication: true,
  EnableCloudwatchLogsExports: ["postgresql", "upgrade"],
  DeletionProtection: true,
  MaxAllocatedStorage: 1000,
  Tags: [
    {
      Key: PROJECT_TAG_KEY,
      Value: "", // → project name
    },
  ],
};

// DNS ROUTING
/**
 * Route53 DNS record change set template for creating/updating A records.
 * Creates an alias record that points the user's domain to the CloudFront distribution.
 * @type {object} Route53 ChangeResourceRecordSets Change config
 */
export const changeSet = {
  Action: "UPSERT",
  ResourceRecordSet: {
    Name: "FUBAR", // → User's domain name
    Type: "A",
    Region: "us-east-1",
    SetIdentifier: "PushkinSet",
    AliasTarget: {
      HostedZoneId: "Z2FDTNDATAQYW2",
      DNSName: "FUBAR", // → CloudFront distribution domain name
      EvaluateTargetHealth: false,
    },
  },
};

// MONITORING
/**
 * CloudWatch alarm config for monitoring high usage of CPU of ECS cluster.
 * Criterion: >60% for at last 2 out of the last 3 mins (checked every 5 minutes)
 * NOTE: Does not trigger auto-scaling. This is instead handled by AWS Target Tracking.
 * @type {object} CloudWatch PutMetricAlarm config
 */

export const alarmCPUHigh = {
  AlarmName: "cpuHigh", // → project name gets prepended
  AlarmDescription: "CPU Usage is too high",
  ActionsEnabled: true,
  OKActions: [""],
  AlarmActions: ["FUBAR"], // → SNS topic ARN
  InsufficientDataActions: [""],
  MetricName: "CPUUtilization",
  Namespace: "AWS/ECS",
  Statistic: "Average",
  ExtendedStatistic: "",
  Dimensions: [
    {
      Name: "ClusterName",
      Value: "FUBAR",
    },
  ],
  Period: 60,
  Unit: "Percent",
  EvaluationPeriods: 3,
  DatapointsToAlarm: 2,
  Threshold: 60.0,
  ComparisonOperator: "GreaterThanThreshold",
  TreatMissingData: "breaching",
};

/**
 * CloudWatch alarm config for monitoring high usage of RAM of ECS cluster.
 * Criterion: >60% for at least 2 of the last 3 mins (checked every 5 minutes)
 * NOTE: Does not trigger auto-scaling. This is instead handled by AWS Target Tracking.
 * @type {object} CloudWatch PutMetricAlarm config
 */
export const alarmRAMHigh = {
  AlarmName: "alarmRAMHigh", // → project name gets prepended
  AlarmDescription: "Memory Usage is too high",
  ActionsEnabled: true,
  OKActions: [""],
  AlarmActions: ["FUBAR"], // → SNS topic ARN
  InsufficientDataActions: [""],
  MetricName: "MemoryUtilization",
  Namespace: "AWS/ECS",
  Statistic: "Average",
  ExtendedStatistic: "",
  Dimensions: [
    {
      Name: "ClusterName",
      Value: "FUBAR",
    },
  ],
  Period: 60,
  Unit: "Percent",
  EvaluationPeriods: 3,
  DatapointsToAlarm: 2,
  Threshold: 60.0,
  ComparisonOperator: "GreaterThanThreshold",
  TreatMissingData: "breaching",
};

/**
 * CloudWatch alarm config for monitoring high write latency of RDS instance.
 * Criterion: >500ms for 2 consecutive mins (checked every 5 minutes)
 * NOTE: Does not trigger auto-scaling.
 */
export const alarmRDSWriteLatencyHigh = {
  AlarmName: "alarmRDSWriteLatencyHigh",
  AlarmDescription: "RDS write latency is too high",
  ActionsEnabled: true,
  OKActions: [""],
  AlarmActions: [""],
  InsufficientDataActions: [""],
  MetricName: "WriteLatency",
  Namespace: "AWS/RDS",
  Statistic: "Average",
  ExtendedStatistic: "",
  Dimensions: [
    {
      Name: "DBInstanceIdentifier",
      Value: "FUBAR",
    },
  ],
  Period: 300,
  Unit: "Seconds",
  EvaluationPeriods: 2,
  DatapointsToAlarm: 2,
  Threshold: 0.5,
  ComparisonOperator: "GreaterThanThreshold",
  TreatMissingData: "missing",
};

// AUTO-SCALING (currently unused)
/**
 * Auto Scaling Launch Config for ECS cluster.
 * Would allow automatic scaling of ECS instances based on load.
 * @type {object} AutoScaling CreateLaunchConfiguration config
 */
export const launchGroup = {
  LaunchConfigName: "FUBAR",
  MinSize: 2,
  MaxSize: 10,
  DesiredCapacity: 2,
  DefaultCooldown: 300,
  AvailabilityZones: ["us-east-1a", "us-east-1b"],
  HealthCheckType: "EC2",
  HealthCheckGracePeriod: 300,
  VPCZoneIdentifier: "FUBAR",
  TerminationPolicies: ["DEFAULT"],
  NewInstancesProtectedFromScaleIn: true,
  ServiceLinkedRoleARN: "FUBAR",
};

/**
 * Auto Scaling Target Tracking Policy for ECS cluster.
 * Uses AWS predefined metric ALBRequestCountPerTarget to scale ECS instances based on request load.
 * Target: 700 requests per target (ECS instance).
 */
export const scalingPolicyTargets = {
  TargetValue: 700.0,
  PredefinedMetricSpecification: {
    PredefinedMetricType: "ALBRequestCountPerTarget",
    ResourceLabel:
      "app/EC2Co-EcsEl-1TKLTMITMM0EO/f37c06a68c1748aa/targetgroup/EC2Co-Defau-LDNM7Q3ZH1ZN/6d4ea56ca2d6a18d",
  },
};
