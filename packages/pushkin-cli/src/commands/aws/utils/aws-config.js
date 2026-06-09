/**
 * AWS user configuration loader.
 * Loads user-tunable deployment settings from aws-deploy.yaml.
 * extraConfig() field in each section allows users to specify raw AWS SDK parameters for advanced use cases.
 * To tune internal operational constants (timeouts, etc.) edit constants.js.
 * @module aws/utils/aws-config
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

const AWS_CONFIG_TEMPLATE = `# AWS deployment configuration for Pushkin
# Uncomment and modify any field to override the default. All values shown are defaults.
# Documentation: https://pushkin-consortium.github.io/pushkin/4.2/getting-started/deploying-to-aws/

# AWS region to deploy resources to.
# region: us-east-1

# CloudFront CDN settings
# cloudfront:
#   # PriceClass_100 (cheapest, N.America + EU only) | PriceClass_200 | PriceClass_All
#   priceClass: PriceClass_100
#   # Raw CloudFront CreateDistribution parameters to pass through (advanced use)
#   extraConfig: {}

# ECS container resource allocation
# Memory is in MB; cpu is in CPU units (1024 = 1 vCPU)
# ecs:
#   api:
#     memory: 512
#     memoryReservation: 256
#     cpu: 256
#   worker:
#     memory: 512
#     memoryReservation: 256
#     cpu: 256
#   rabbitmq:
#     memory: 512
#     memoryReservation: 256
#     cpu: 256
#   # Raw ECS task definition parameters to pass through (advanced use)
#   extraConfig: {}

# RDS PostgreSQL settings
# rds:
#   instanceClass: db.t3.micro
#   allocatedStorage: 20       # GB — initial storage
#   maxAllocatedStorage: 100   # GB — autoscaling cap
#   backupRetentionPeriod: 7   # days
#   multiAZ: false             # set true for production; enables failover but doubles RDS cost
#   # Raw RDS CreateDBInstance parameters to pass through (advanced use)
#   extraConfig: {}

# ECS autoscaling settings
# autoscaling:
#   minSize: 2
#   maxSize: 10
#   desiredCapacity: 2
#   alarms:
#     cpu:
#       threshold: 75          # percent utilization
#       evaluationPeriods: 2
#     memory:
#       threshold: 75          # percent utilization
#       evaluationPeriods: 2
#     rds:
#       writeLatency: 100      # milliseconds
#       evaluationPeriods: 2

# Security settings
# security:
#   enableWAF: true
#   adminIPWhitelist: []       # e.g. ["203.0.113.0/24"] — IPs allowed to admin endpoints

# Monitoring and logging
# monitoring:
#   logRetentionDays: 7
#   alarmEmail: null           # e.g. "ops@example.com" — receives CloudWatch alarm emails
`;

const DEFAULT_AWS_CONFIG = {
  region: "us-east-1",

  cloudfront: {
    priceClass: "PriceClass_100", // PriceClass_100 (cheapest, N.America+EU) | PriceClass_200 | PriceClass_All
    extraConfig: {},
  },

  ecs: {
    api: { memory: 512, memoryReservation: 256, cpu: 256 }, // MB / MB / CPU units (1024 = 1 vCPU)
    worker: { memory: 512, memoryReservation: 256, cpu: 256 },
    rabbitmq: { memory: 512, memoryReservation: 256, cpu: 256 },
    extraConfig: {},
  },

  rds: {
    instanceClass: "db.t3.micro",
    allocatedStorage: 20, // GB
    maxAllocatedStorage: 100, // GB
    backupRetentionPeriod: 7, // days
    multiAZ: false, // set to true for production — enables automatic failover but doubles RDS cost
    extraConfig: {},
  },

  autoscaling: {
    minSize: 2,
    maxSize: 10,
    desiredCapacity: 2,
    alarms: {
      cpu: { threshold: 75, evaluationPeriods: 2 },
      memory: { threshold: 75, evaluationPeriods: 2 },
      rds: { writeLatency: 100, evaluationPeriods: 2 },
    },
  },

  security: {
    enableWAF: true,
    adminIPWhitelist: [],
  },

  monitoring: {
    logRetentionDays: 7,
    alarmEmail: null,
  },
};

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] === null || source[key] === undefined) continue;
    if (
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Writes a commented aws-deploy.yaml template to the project directory if one does not already exist.
 * @param {string|null} configPath - Optional path; defaults to current directory
 */
function generateAwsConfig(configPath = null) {
  const filePath = configPath || path.join(process.cwd(), "aws-deploy.yaml");
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, AWS_CONFIG_TEMPLATE, "utf8");
  console.log(
    `Created aws-deploy.yaml with default settings. Edit it to customize your deployment before re-running.`,
  );
}

/**
 * Returns a deep copy of the default AWS configuration object.
 * Useful for testing or as a template for user configuration.
 */
function getDefaultAwsConfig() {
  return structuredClone(DEFAULT_AWS_CONFIG);
}

/**
 * Loads AWS configuration from aws-deploy.yaml in the current project, merging with defaults.
 * @param {string|null} configPath - Optional path to aws-deploy.yaml; defaults to current directory
 * @returns {object} Merged AWS configuration object
 * @throws {Error} If aws-deploy.yaml exists but cannot be read or parsed
 */
function loadAwsConfig(configPath = null) {
  const filePath = configPath || path.join(process.cwd(), "aws-deploy.yaml");
  if (!fs.existsSync(filePath)) return DEFAULT_AWS_CONFIG;
  try {
    const userConfig = jsYaml.load(fs.readFileSync(filePath, "utf8"));
    if (userConfig === null) return DEFAULT_AWS_CONFIG;
    if (typeof userConfig !== "object") {
      console.warn(`Warning: aws-deploy.yaml is not a valid YAML object. Using defaults.`);
      return DEFAULT_AWS_CONFIG;
    }
    return deepMerge(DEFAULT_AWS_CONFIG, userConfig);
  } catch (error) {
    console.warn(`Warning: Error loading aws-deploy.yaml: ${error.message}. Using defaults.`);
    return DEFAULT_AWS_CONFIG;
  }
}

/**
 * Validates the AWS configuration object.
 * @param {object} awsConfig
 * @returns {string[]} Array of error messages, empty if valid
 */
function validateAwsConfig(awsConfig) {
  const errors = [];

  const validRegions = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "eu-west-2",
    "eu-central-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
  ];
  if (!validRegions.includes(awsConfig.region))
    errors.push(`Invalid region: ${awsConfig.region}. Must be one of: ${validRegions.join(", ")}`);

  if (awsConfig.autoscaling.minSize > awsConfig.autoscaling.maxSize)
    errors.push(
      `autoscaling.minSize (${awsConfig.autoscaling.minSize}) cannot be greater than maxSize (${awsConfig.autoscaling.maxSize})`,
    );

  if (
    awsConfig.autoscaling.desiredCapacity < awsConfig.autoscaling.minSize ||
    awsConfig.autoscaling.desiredCapacity > awsConfig.autoscaling.maxSize
  )
    errors.push(
      `autoscaling.desiredCapacity (${awsConfig.autoscaling.desiredCapacity}) must be between minSize and maxSize`,
    );

  for (const service of ["api", "worker", "rabbitmq"]) {
    if (awsConfig.ecs[service].memory <= 0) errors.push(`ecs.${service}.memory must be positive`);
    if (awsConfig.ecs[service].cpu <= 0) errors.push(`ecs.${service}.cpu must be positive`);
    if (awsConfig.ecs[service].memoryReservation > awsConfig.ecs[service].memory)
      errors.push(`ecs.${service}.memoryReservation cannot exceed memory hard limit`);
  }

  const validPriceClasses = ["PriceClass_100", "PriceClass_200", "PriceClass_All"];
  if (!validPriceClasses.includes(awsConfig.cloudfront.priceClass))
    errors.push(
      `Invalid cloudfront.priceClass: ${awsConfig.cloudfront.priceClass}. Must be one of: ${validPriceClasses.join(", ")}`,
    );

  return errors;
}

export { generateAwsConfig, getDefaultAwsConfig, loadAwsConfig, validateAwsConfig };
