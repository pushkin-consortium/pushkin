/**
 * AWS Configuration Loader
 *
 * Loads user-configurable AWS deployment parameters from aws-deploy.yaml.
 * Falls back to sensible defaults if the file doesn't exist.
 * @module aws-config
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

/**
 * Default AWS deployment configuration
 * These values are used when aws-deploy.yaml is not present
 */
const DEFAULT_AWS_CONFIG = {
  region: "us-east-1",

  timeouts: {
    cloudfront: {
      maxWaitTime: 1800, // seconds (30 minutes)
      checkInterval: 30, // seconds
      oacDeletion: {
        maxRetries: 10,
        retryInterval: 10, // seconds
      },
    },
    elb: {
      listenerDeletion: {
        maxWaitTime: 300, // seconds
        checkInterval: 5, // seconds
      },
    },
    route53: {
      recordSetDeletion: {
        maxWaitTime: 600, // seconds (10 minutes)
        checkInterval: 20, // seconds
      },
    },
    rds: {
      availability: {
        maxWaitTime: 1200, // seconds (20 min) — waitUntilDBInstanceAvailable
        minDelay: 10,
        maxDelay: 20,
      },
      endpoint: {
        maxWaitTime: 120, // seconds — endpoint address waiter
        minDelay: 10,
        maxDelay: 30,
      },
      recording: {
        timeoutMs: 1800000, // ms (30 min) — recordDBs race timeout
      },
      deletionProtection: {
        timeoutMs: 300000, // ms (5 min) — waitForDeletionProtectionDisabled
        checkInterval: 10, // seconds
      },
      deletion: {
        timeoutMs: 1200000, // ms (20 min) — waitForDBsDeletion
        minDelay: 20,
        maxDelay: 30,
      },
    },
    cloudformation: {
      stackDeletion: {
        maxWaitTime: 600, // seconds (10 minutes)
        minDelay: 5,
        maxDelay: 30,
      },
    },
    ecs: {
      tasksStopped: {
        maxWaitTime: 600, // seconds (10 minutes)
        minDelay: 5,
        maxDelay: 10,
      },
      servicesDeletion: {
        maxWaitTime: 300, // seconds (5 minutes)
        minDelay: 5,
        maxDelay: 5,
      },
    },
    default: {
      maxRetries: 5,
      backoffMultiplier: 2,
      baseDelay: 1000,
    },
  },

  autoscaling: {
    minSize: 2,
    maxSize: 10,
    desiredCapacity: 2,
    alarms: {
      cpu: {
        threshold: 75,
        evaluationPeriods: 2,
      },
      memory: {
        threshold: 75,
        evaluationPeriods: 2,
      },
      rds: {
        writeLatency: 100,
        evaluationPeriods: 2,
      },
    },
  },

  cloudwatch: {
    logRetentionDays: 7,
  },

  ecs: {
    api: {
      memory: 512,
      memoryReservation: 256,
      cpu: 256,
    },
    worker: {
      memory: 512,
      memoryReservation: 256,
      cpu: 256,
    },
    rabbitmq: {
      memory: 512,
      memoryReservation: 256,
      cpu: 256,
    },
  },

  database: {
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    maxAllocatedStorage: 100,
    backupRetentionPeriod: 7,
    preferredBackupWindow: "03:00-04:00",
    preferredMaintenanceWindow: "mon:04:00-mon:05:00",
  },

  cloudfront: {
    priceClass: "PriceClass_100",
    minTTL: 0,
    defaultTTL: 86400,
    maxTTL: 31536000,
  },

  security: {
    enableWAF: true,
    adminIPWhitelist: [],
  },

  monitoring: {
    logRetentionDays: 7,
    detailedMetrics: false,
    alarmEmail: null,
  },

  s3: {
    uploadBatchSize: 10, // Number of files to upload concurrently to avoid overwhelming the connection
  },

  costs: {
    useSpotInstances: false,
    s3Lifecycle: true,
    autoDeleteLogs: true,
  },

  advanced: {
    ecsExec: false,
    xrayTracing: false,
    ecsKeyPairName: "my-pushkin-key-pair",
    vpc: {
      useDefault: true,
    },
  },
  tagging: {
    projectTagKey: "PUSHKIN",
  },
};

/**
 * Deep merge two objects, with source overriding target
 * Arrays are replaced, not merged
 * @param {object} target - The target object (defaults)
 * @param {object} source - The source object (user config)
 * @returns {object} - Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] === null || source[key] === undefined) {
      continue; // Skip null/undefined values
    }

    if (
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      // Recursively merge nested objects
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      // Replace primitive values and arrays
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Load AWS deployment configuration from aws-deploy.yaml
 * Merges user config with defaults
 * @param {string} [configPath] - Optional path to config file (defaults to cwd/aws-deploy.yaml)
 * @returns {object} - Configuration object with all settings
 */
export function loadAwsConfig(configPath = null) {
  const filePath = configPath || path.join(process.cwd(), "aws-deploy.yaml");

  // If no user config, return defaults
  if (!fs.existsSync(filePath)) {
    return DEFAULT_AWS_CONFIG;
  }

  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const userConfig = jsYaml.load(fileContent);

    // Validate that userConfig is an object
    if (typeof userConfig !== "object" || userConfig === null) {
      console.warn(`Warning: aws-deploy.yaml is not a valid YAML object. Using defaults.`);
      return DEFAULT_AWS_CONFIG;
    }

    // Deep merge user config with defaults
    const mergedConfig = deepMerge(DEFAULT_AWS_CONFIG, userConfig);

    return mergedConfig;
  } catch (error) {
    console.warn(`Warning: Error loading aws-deploy.yaml: ${error.message}. Using defaults.`);
    return DEFAULT_AWS_CONFIG;
  }
}

/**
 * Get default configuration (useful for testing or documentation)
 * @returns {object} - Default configuration object
 */
export function getDefaultConfig() {
  return { ...DEFAULT_AWS_CONFIG };
}

/**
 * Validate configuration values
 * Returns array of validation errors, empty if valid
 * @param {object} config - Configuration object to validate
 * @returns {Array<string>} - Array of error messages
 */
export function validateConfig(config) {
  const errors = [];

  // Validate region
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
  if (!validRegions.includes(config.region)) {
    errors.push(`Invalid region: ${config.region}. Must be one of: ${validRegions.join(", ")}`);
  }

  // Validate autoscaling
  if (config.autoscaling.minSize > config.autoscaling.maxSize) {
    errors.push(
      `autoscaling.minSize (${config.autoscaling.minSize}) cannot be greater than maxSize (${config.autoscaling.maxSize})`,
    );
  }

  if (
    config.autoscaling.desiredCapacity < config.autoscaling.minSize ||
    config.autoscaling.desiredCapacity > config.autoscaling.maxSize
  ) {
    errors.push(
      `autoscaling.desiredCapacity (${config.autoscaling.desiredCapacity}) must be between minSize and maxSize`,
    );
  }

  // Validate ECS resources (must be positive numbers)
  const ecsServices = ["api", "worker", "rabbitmq"];
  for (const service of ecsServices) {
    if (config.ecs[service].memory <= 0) {
      errors.push(`ecs.${service}.memory must be positive`);
    }
    if (config.ecs[service].cpu <= 0) {
      errors.push(`ecs.${service}.cpu must be positive`);
    }
    if (config.ecs[service].memoryReservation > config.ecs[service].memory) {
      errors.push(`ecs.${service}.memoryReservation cannot exceed memory hard limit`);
    }
  }

  // Validate CloudFront price class
  const validPriceClasses = ["PriceClass_100", "PriceClass_200", "PriceClass_All"];
  if (!validPriceClasses.includes(config.cloudfront.priceClass)) {
    errors.push(
      `Invalid cloudfront.priceClass: ${config.cloudfront.priceClass}. Must be one of: ${validPriceClasses.join(", ")}`,
    );
  }

  // Validate timeout values (must be positive numbers)
  if (config.timeouts.cloudfront.maxWaitTime <= 0) {
    errors.push("timeouts.cloudfront.maxWaitTime must be positive");
  }
  if (config.timeouts.cloudfront.checkInterval <= 0) {
    errors.push("timeouts.cloudfront.checkInterval must be positive");
  }
  if (config.timeouts.cloudfront.oacDeletion.maxRetries <= 0) {
    errors.push("timeouts.cloudfront.oacDeletion.maxRetries must be positive");
  }
  if (config.timeouts.cloudfront.oacDeletion.retryInterval <= 0) {
    errors.push("timeouts.cloudfront.oacDeletion.retryInterval must be positive");
  }

  if (config.timeouts.rds.availability.maxWaitTime <= 0) {
    errors.push("timeouts.rds.availability.maxWaitTime must be positive");
  }
  if (config.timeouts.rds.availability.minDelay <= 0) {
    errors.push("timeouts.rds.availability.minDelay must be positive");
  }
  if (config.timeouts.rds.deletion.timeoutMs <= 0) {
    errors.push("timeouts.rds.deletion.timeoutMs must be positive");
  }

  if (config.timeouts.default.maxRetries <= 0) {
    errors.push("timeouts.default.maxRetries must be positive");
  }
  if (config.timeouts.default.backoffMultiplier <= 0) {
    errors.push("timeouts.default.backoffMultiplier must be positive");
  }
  if (config.timeouts.default.baseDelay <= 0) {
    errors.push("timeouts.default.baseDelay must be positive");
  }

  return errors;
}
