/**
 * AWS Infrastructure Configuration Templates
 *
 * This file exports configuration objects used by aws/index.js to provision AWS resources.
 * All "FUBAR" placeholder values are replaced during deployment.
 *
 * Architecture Overview:
 *
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
 * @see index.js for deployment logic that uses these configurations
 */

// FRONT-END DELIVERY
/**
 * AWS WAF Access Control List configuration for CloudFront.
 * Protects Pushkin site from common web exploits and malicious traffic by controlling access to the
 * CloudFront distribution.
 *
 * Rulesets (all AWS-managed):
 * 1. AmazonIpReputationList - Blocks IP addresses known to engage in malicious activities
 * 2. CommonRuleSet - Protects against common exploitation of vulnerabilities, e.g. those described
 * in OWASP Top 10; recommended for all web applications
 * 3. KnownBadInputsRuleSet - Blocks requests with patterns known to be malicious
 * @type {object} AWS WAFv2 WebACL configuration
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
 * S3 bucket policy that allows CloudFront to access objects in the S3 bucket.
 * This implements the "Origin Access Control" (OAC) security model where CloudFront
 * is the only entity allowed to serve files from the S3 bucket, preventing direct public access.
 *
 * Values that get replaced during deployment:
 * - Resource → actual bucket ARN from project's awsResources.js
 * - Condition.StringEquals."AWS:SourceArn" → actual CloudFront distribution ARN from project's awsResources.js
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
      Resource: "arn:aws:s3:::example.com/*",
      Condition: {
        StringEquals: {
          "AWS:SourceArn": "cloudfront",
        },
      },
    },
  ],
};

/**
 * CORS (Cross-Origin Resource Sharing) policy for S3 bucket.
 * Would allow web browsers to make cross-origin requests to the S3 bucket.
 * NOTE: Currently unused.
 * Kept for potential future use.
 * @type {object} S3 PutBucketCors configuration
 */
export const corsPolicy = {
  Bucket: "",
  CORSConfiguration: {
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
 * Configuration for CloudFront (the CDN for delivering the Pushkin site front-end)
 *
 * Values that get replaced during deployment:
 * - CallerReference → gets replaced with name of the S3 bucket
 * - Aliases → aliases for root domain and www subdomain get added if using custom domain
 * - Origins.Items[0].Id → S3 bucket name (awsName)
 * - Origins.Items[0].DomainName → S3 bucket domain (awsName + .s3.amazonaws.com)
 * - Origins.Items[0].OriginAccessControlId → OAC ID
 * - DefaultCacheBehavior.TargetOriginId → S3 bucket name (awsName)
 * - WebACLId → WAF ACL ARN
 * @type {object} CloudFront DistributionWithTags configuration
 */
export const cloudFront = {
  Tags: {
    Items: [
      {
        Key: "PUSHKIN",
        Value: "PUSHKIN",
      },
    ],
  },
  DistributionConfig: {
    CallerReference: "string",
    Aliases: {
      Quantity: 0,
    },
    DefaultRootObject: "index.html",
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: "bucket",
          DomainName: "URL",
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
          OriginAccessControlId: "OACID",
        },
      ],
    },
    OriginGroups: {
      Quantity: 0,
    },
    DefaultCacheBehavior: {
      TargetOriginId: "bucket",
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
    WebACLId: "ACLID",
    HttpVersion: "http2and3",
    IsIPV6Enabled: true,
    ContinuousDeploymentPolicyId: "",
    Staging: false,
  },
};

// BACK-END CONTAINER CONFIGS
/**
 * Docker Compose task definition for the Pushkin API server.
 * The API handles HTTP requests from the front-end and communicates with experiment workers via RabbitMQ.
 *
 * Role in architecture:
 * - Receives API calls from the front-end
 * - Sends experiment tasks to RabbitMQ queues
 * - Queries databases for experiment data
 *
 * Configuration:
 * - Image: User's DockerHub image (built from pushkin/api directory)
 * - Memory limit: 128 MB
 * - Port 80: HTTP traffic (behind Application Load Balancer)
 * - Logging: CloudWatch Logs with awslogs driver
 *
 * Values that get replaced during deployment:
 * - image → DockerHub ID must be prepended
 * - AMQP_ADDRESS → RabbitMQ connection string with credentials
 * - awslogs-group → "ecs/" + project name
 * - awslogs-stream-prefix → "ecs/api" + project name
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
          "awslogs-group": "FUBAR",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "FUBAR",
        },
      },
    },
  },
};

/**
 * Docker Compose task definition for RabbitMQ message queue.
 * RabbitMQ handles asynchronous communication between the API and experiment workers.
 *
 * Role in architecture:
 * - API sends experiment tasks to RabbitMQ queues
 * - Workers listen to their experiment's queue for tasks
 * - Workers send results back to the API via RabbitMQ
 *
 * Configuration:
 * - Image: Official RabbitMQ 3.7 with management UI
 * - Memory limit: 512 MB
 * - Ports exposed:
 * - 5672: AMQP protocol (message queue)
 * - 4369: Erlang port mapper (clustering)
 * - 15672: Management UI
 * - 25672: Erlang distribution (clustering)
 * - Logging: CloudWatch Logs with awslogs driver
 *
 * Values that get replaced during deployment:
 * - RABBITMQ_DEFAULT_USER → Username for RabbitMQ
 * - RABBITMQ_DEFAULT_PASS → Password for RabbitMQ
 * - RABBITMQ_ERLANG_COOKIE → Secret for clustering (not used in single-node setup)
 * - awslogs-group → "ecs/" + project name
 * - awslogs-stream-prefix: "ecs/rabbit" + project name
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
          "awslogs-group": "FUBAR",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "FUBAR",
        },
      },
    },
  },
};

/**
 * Docker Compose task definition for experiment worker containers.
 * Each experiment gets its own worker that processes experiment-specific tasks.
 *
 * Role in architecture:
 * - Listens to a dedicated RabbitMQ queue for this experiment
 * - Processes experiment stimuli generation, data validation, etc.
 * - Writes results back to the RDS database
 *
 * Configuration:
 * - Image: User's DockerHub image (built from experiments/{exp}/worker directory)
 * - Memory limit: 128 MB per worker
 * - No exposed ports (internal communication via RabbitMQ only)
 * - Logging: CloudWatch Logs with awslogs driver
 *
 * Values that get replaced during deployment:
 * - EXPERIMENT_NAME → Short name of the experiment (used as service name)
 * - image → DockerHub ID and experiment name must be filled in
 * - AMQP_ADDRESS → RabbitMQ connection string with credentials
 * - awslogs-group → CloudWatch log group name
 * - awslogs-stream-prefix → "ecs" + worker name + project name
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
          "awslogs-group": "FUBAR",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "FUBAR",
        },
      },
    },
  },
};

// BACK-END DB
/**
 * CloudFront Origin Access Control (OAC) configuration for securing S3 bucket access.
 * This configuration is used to create an OAC that allows CloudFront to access the S3 bucket,
 * preventing direct public access to the bucket.
 * @type {object} CloudFront CreateOriginAccessControl configuration
 */
export const OriginAccessControl = {
  Name: "pushkinOAC",
  Description: "Origin Access Control for Pushkin S3 bucket - restricts to CloudFront-only access",
  SigningProtocol: "sigv4",
  SigningBehavior: "always",
  OriginAccessControlOriginType: "s3",
};

/**
 * Configuration for PostgreSQL RDS (Relational Database Service) for storing experiment data.
 *
 * Values that get replaced during deployment:
 * - DBName → project name + dbType
 * - DBInstanceIdentifier → DBName
 * - VpcSecurityGroupIds → 3 security groups: Balancer group, ECS group and RDS group
 * - MasterUserPassword: secure password generated during initDB()
 * - Tags → value set to project name
 * @type {object} RDS CreateDBInstance configuration
 */
export const dbConfig = {
  DBName: "FUBAR",
  DBInstanceIdentifier: "FUBAR1234",
  AllocatedStorage: 20,
  DBInstanceClass: "db.t3.micro",
  Engine: "postgres",
  EngineVersion: "15",
  MasterUsername: "postgres",
  VpcSecurityGroupIds: ["FUBAR"],
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
      Key: "PUSHKIN",
      Value: "",
    },
  ],
};

// DNS ROUTING
/**
 * Route53 DNS record change set template for creating/updating A records.
 * Creates an alias record that points the user's domain to the CloudFront distribution.
 *
 * Configuration:
 * - Action: UPSERT (creates if doesn't exist, updates if it does)
 * - Type: A record (maps domain name to IPv4 address)
 * - AliasTarget: Points to CloudFront (not a direct IP address)
 * - HostedZoneId: Z2FDTNDATAQYW2 is the hosted zone for all CloudFront distributions
 *
 * Values that get replaced during deployment:
 * - Name → User's domain name
 * - DNSName → CloudFront distribution domain name
 * @type {object} Route53 ChangeResourceRecordSets Change configuration
 */
export const changeSet = {
  Action: "UPSERT",
  ResourceRecordSet: {
    Name: "DNS domain name",
    Type: "A",
    Region: "us-east-1",
    SetIdentifier: "PushkinSet",
    AliasTarget: {
      HostedZoneId: "Z2FDTNDATAQYW2",
      DNSName: "",
      EvaluateTargetHealth: false,
    },
  },
};


// MONITORING
/**
 * CloudWatch alarm configuration for monitoring high usage of CPU of ECS cluster.
 * Criterion: >60% for at last 2 out of the last 3 mins (checked every 5 minutes)
 * Sends email alert.
 * NOTE: Does not trigger auto-scaling. This is instead handled by AWS Target Tracking.
 *
 * Values that get replaced during deployment:
 * - Dimensions[0].Value → ECS Cluster name
 * - AlarmName → project shortname + "CPUHigh"
 * - AlarmActions → SNS topic ARNs for notifications
 * @type {object} CloudWatch PutMetricAlarm configuration
 */

export const alarmCPUHigh = {
  AlarmName: "cpuHigh",
  AlarmDescription: "CPU Usage is too high",
  ActionsEnabled: true,
  OKActions: [""],
  AlarmActions: [""],
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
 * CloudWatch alarm configuration for monitoring high usage of RAM of ECS cluster.
 * Criterion: >60% for at least 2 of the last 3 mins (checked every 5 minutes)
 * Sends email alert.
 * NOTE: Does not trigger auto-scaling. This is instead handled by AWS Target Tracking.
 *
 * Values that get replaced during deployment:
 * - Dimensions[0].Value → name of the ECS Cluster
 * - AlarmName → project shortname + "CPUHigh"
 * - AlarmActions → SNS topic ARNs for notifications
 * @type {object} CloudWatch PutMetricAlarm configuration
 */
export const alarmRAMHigh = {
  AlarmName: "alarmRAMHigh",
  AlarmDescription: "Memory Usage is too high",
  ActionsEnabled: true,
  OKActions: [""],
  AlarmActions: [""],
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
 * CloudWatch alarm configuration for monitoring high write latency of RDS instance.
 * Criterion: >500ms for 2 consecutive mins (checked every 5 minutes)
 * Sends email alert.
 * NOTE: Does not trigger auto-scaling.
 *
 * Values that get replaced during deployment:
 * - Dimensions[0].Value → DBInstanceIdentifier (same as DBName, project shortname + dbType)
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
 * Auto Scaling Launch Configuration for ECS cluster.
 * Would allow automatic scaling of ECS instances based on load.
 *
 * Values that get replaced during deployment:
 * - LaunchConfigurationName → generated launch config name with project shortname
 * - VPCZoneIdentifier → comma-separated list of subnet IDs in the VPC
 * - ServiceLinkedRoleARN → ARN of the AWS auto-scaling service role
 * @type {object} AutoScaling CreateLaunchConfiguration configuration
 */
export const launchGroup = {
  LaunchConfigurationName: "FUBAR",
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
