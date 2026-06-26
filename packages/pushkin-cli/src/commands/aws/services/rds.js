/**
 * Handles creation, configuration, and deletion of RDS database instances.
 * RDS: A managed AWS service for setting up, operating, and scaling a cloud relational database.
 * @module aws/services/rds
 */

import crypto from "crypto";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  CreateDBInstanceCommand,
  ModifyDBInstanceCommand,
  DeleteDBInstanceCommand,
  waitUntilDBInstanceAvailable,
  waitUntilDBInstanceDeleted,
} from "@aws-sdk/client-rds";
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { loadPushkinConfig, savePushkinConfig } from "../../../utils/pushkin-config.js";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../utils/aws-profile.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { readAwsResources, writeAwsResources } from "../utils/aws-resources.js";
import { dbConfig } from "../awsConfigs.js";
import { AWS_REGION, PROJECT_TAG_KEY } from "../constants.js";

function createRDSClient() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(RDSClient);
}

async function findDbInRds(instanceId, rdsClient = null) {
  try {
    if (!rdsClient) {
      rdsClient = createRDSClient();
    }
    const response = await rdsClient.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId }),
    );
    return response.DBInstances?.[0] ?? null;
  } catch (error) {
    if (error.name === "DBInstanceNotFoundFault") {
      return null;
    } else {
      console.error(`Unable to find database ${instanceId} in RDS:`, error);
      throw error;
    }
  }
}

function validateDbMatch(dbType, pushkinConfig, rdsDb) {
  const yamlDb = pushkinConfig.databases.production[dbType];
  const mismatches = [];
  // Maps pushkin.yaml fields to their AWS RDS API equivalents for validation.
  // yamlPath/rdsPath use dot-notation for nested traversal (e.g. "Endpoint.Port").
  // required: false skips comparison when RDS returns null; true treats null as a mismatch.
  const dbFieldMappings = [
    {
      name: "Instance ID",
      yamlPath: "instanceId",
      rdsPath: "DBInstanceIdentifier",
      required: true,
      transform: (val) => val?.toLowerCase(),
    },
    {
      name: "User",
      yamlPath: "user",
      rdsPath: "MasterUsername",
      required: true,
    },
    {
      name: "Port",
      yamlPath: "port",
      rdsPath: "Endpoint.Port",
      required: true,
      transform: Number, // YAML may serialize port as string; RDS returns integer
    },
    {
      name: "Host",
      yamlPath: "host",
      rdsPath: "Endpoint.Address",
      required: true,
    },
  ];

  for (const mapping of dbFieldMappings) {
    const yamlValue = mapping.yamlPath.split(".").reduce((curr, key) => curr?.[key], yamlDb);
    let rdsValue = mapping.rdsPath.split(".").reduce((curr, key) => curr?.[key], rdsDb);

    // Skip if field doesn't exist in RDS and isn't required
    if (rdsValue == null && !mapping.required) {
      continue;
    }

    // Skip if field doesn't exist in yaml config (may be optional)
    if (yamlValue == null) {
      continue;
    }

    // Apply transformations if specified
    const yamlCompare = mapping.transform ? mapping.transform(yamlValue) : yamlValue;
    const rdsCompare = mapping.transform ? mapping.transform(rdsValue) : rdsValue;

    if (yamlCompare !== rdsCompare) {
      mismatches.push(`${mapping.name}: RDS has "${rdsValue}", pushkin.yaml has "${yamlValue}"`);
    }
  }

  return mismatches;
}

async function checkIfDbShouldBeCreated(instanceId, dbType) {
  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  const inYAML =
    pushkinConfig.databases.production != null &&
    pushkinConfig.databases.production[dbType]?.instanceId === instanceId;

  const rdsDb = await findDbInRds(instanceId);

  if (inYAML && rdsDb) {
    // Case 1: In both YAML and RDS - validate they match
    console.warn(`${instanceId} found in both pushkin.yaml and RDS. Validating configuration...`);
    const mismatches = validateDbMatch(dbType, pushkinConfig, rdsDb);

    if (mismatches.length === 0) {
      console.log(
        `${instanceId} is already configured on RDS. Skipping creation.\n` +
          `⚠️  Note: If database connection fails, the password in pushkin.yaml may be incorrect.\n` +
          `To fix: Go to AWS Console → RDS → Modify database → Set new master password → Update pushkin.yaml`,
      );
      return false;
    } else {
      const error = new Error(
        `Database parameter mismatch: ${instanceId} exists in RDS but with different configuration than pushkin.yaml\n\n` +
          `Mismatches found:\n` +
          mismatches.map((m) => `  - ${m}`).join("\n") +
          `\n\n` +
          `To resolve this, choose ONE of these options:\n` +
          `  1. If RDS has the correct values, update pushkin.yaml to match RDS\n` +
          `  2. If pushkin.yaml has the correct values:\n` +
          `     2a. Manually update the RDS database in AWS Console to match pushkin.yaml\n` +
          `     2b. Or delete the database from RDS and recreate it\n` +
          `         - Run: pushkin aws armageddon (this deletes all AWS resources)\n` + // TODO: killize
          `         - Then: pushkin aws init (to recreate everything)\n`,
      );
      console.error(error);
      throw error;
    }
  } else if (inYAML && !rdsDb) {
    // Case 2: In YAML but not RDS - recreate it
    console.warn(`${instanceId} listed in pushkin.yaml but not found on RDS. Creating...`);
    return true;
  } else if (!inYAML && rdsDb) {
    // Case 3: In RDS but not YAML - check if it's our DB with a cleared/stale name
    // WHY: A previous failed init may have created the DB but left name: null in pushkin.yaml
    // (either from a write failure or the old code that cleared credentials on re-init).
    // If the host already recorded in pushkin.yaml matches the RDS endpoint, it's our database.
    const productionDb = pushkinConfig.databases.production?.[dbType];
    if (productionDb?.host && productionDb.host === rdsDb.Endpoint?.Address) {
      console.log(`${instanceId}: Found in RDS with matching host. Reconnecting...`);
      productionDb.instanceId = instanceId;
      productionDb.database = "postgres";

      // If password was cleared, generate a new one and reset it on RDS
      if (!productionDb.password) {
        console.log(
          `${instanceId}: Password missing from pushkin.yaml. Resetting RDS master password...`,
        );
        const newPassword = crypto.randomBytes(16).toString("base64url").slice(0, 16);
        try {
          const rdsClient = createRDSClient();
          await rdsClient.send(
            new ModifyDBInstanceCommand({
              DBInstanceIdentifier: instanceId,
              MasterUserPassword: newPassword,
              ApplyImmediately: true,
            }),
          );
          console.log(`${instanceId}: Password reset successfully.`);
        } catch (error) {
          console.error(`${instanceId}: Failed to reset RDS master password:`, error);
          throw error;
        }
        productionDb.password = newPassword;
      }

      try {
        await savePushkinConfig(pushkinConfig);
        console.log(`${instanceId}: Restored credentials in pushkin.yaml.`);
      } catch (error) {
        console.error(`${instanceId}: Failed to update pushkin.yaml:`, error);
        throw error;
      }
      return false;
    }
    // Genuine conflict - an instance with this ID exists in RDS but has no connection to our project
    const error = new Error(
      `Database conflict: ${instanceId} exists in RDS but not in pushkin.yaml. ` +
        `You need to either delete the database from RDS or add its credentials to pushkin.yaml.`,
    );
    console.error(error);
    throw error;
  } else {
    // Case 4: Not in YAML, not in RDS - create new
    return true;
  }
}

async function getDbConfig(instanceId, dbType, verbose) {
  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }
  if (verbose) {
    console.log(
      `${instanceId}: Returning existing database config:`,
      pushkinConfig.databases.production[dbType],
    );
  }
  return pushkinConfig.databases.production[dbType];
}

/**
 * Create a database (create new or return existing).
 * Orchestrates the entire database creation process:
 * 1. Generate database name
 * 2. Check if database should be created (validates against RDS and pushkin.yaml)
 * 3. Either create new database or return existing configuration
 * @param {string} dbType - The type of database (e.g., "experiment", "transaction")
 * @param {string} securityGroupID - The security group ID for the database
 * @param {string} projectName
 * @param {boolean} verbose - Whether to log detailed information
 * @returns {Promise<object>} - The database configuration object
 */
async function createDb(dbType, securityGroupID, projectName, verbose = false) {
  console.log(`Creating ${dbType} database.`);
  const instanceId = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .concat("-" + dbType + "-db"); // e.g. pushkinquickstart-experiment-db

  const shouldCreate = await checkIfDbShouldBeCreated(instanceId, dbType);
  if (!shouldCreate) {
    return await getDbConfig(instanceId, dbType, verbose);
  }

  const dbPassword = crypto.randomBytes(16).toString("base64url").slice(0, 16);
  const myDbConfig = structuredClone(dbConfig);
  myDbConfig.DBInstanceIdentifier = instanceId;
  myDbConfig.VpcSecurityGroupIds = [securityGroupID];
  myDbConfig.MasterUserPassword = dbPassword;
  myDbConfig.Tags = [{ Key: PROJECT_TAG_KEY, Value: projectName }];

  const rdsClient = createRDSClient();

  try {
    await rdsClient.send(new CreateDBInstanceCommand(myDbConfig));
  } catch (error) {
    console.error(`Unable to create database ${instanceId}:`, error);
    throw error;
  }

  if (verbose) {
    console.log(
      `Database ${instanceId} created with the following configuration:\n${JSON.stringify(myDbConfig, null, 2)}`,
    );
  } else {
    console.log(`Database ${instanceId} created.`);
  }

  try {
    console.log(
      `Waiting for ${instanceId} to spool up. This may take a while, but will timeout if not completed within 20 minutes...`,
    );
    const waitStart = Date.now();
    const { availability } = loadAwsConfig().timeouts.rds;
    await waitUntilDBInstanceAvailable(
      {
        client: rdsClient,
        maxWaitTime: availability.maxWaitTime,
        minDelay: availability.minDelay,
        maxDelay: availability.maxDelay,
      },
      { DBInstanceIdentifier: instanceId },
    );
    const waitTime = Date.now() - waitStart;
    console.log(
      `${instanceId} is spooled up after ${Math.floor(waitTime / 60000)} minutes ${Math.floor((waitTime % 60000) / 1000)} seconds!`,
    );
  } catch (error) {
    if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
      console.warn(`Warning: spooling up ${instanceId} timed out after 20 minutes.`);
    } else {
      console.warn(`Warning: spooling up ${instanceId} failed with error:`, error);
    }
  }

  let dbEndpoint;
  console.log(`${instanceId}: Retrieving database endpoint...`);
  const { endpoint } = loadAwsConfig().timeouts.rds;
  try {
    await createWaiter(
      {
        client: createRDSClient(),
        maxWaitTime: endpoint.maxWaitTime,
        minDelay: endpoint.minDelay,
        maxDelay: endpoint.maxDelay,
      },
      { DBInstanceIdentifier: instanceId },
      async (client, input) => {
        const response = await client.send(new DescribeDBInstancesCommand(input));
        if (response?.DBInstances?.[0]?.Endpoint?.Address) {
          dbEndpoint = response;
          return { state: WaiterState.SUCCESS };
        }
        console.log(`${instanceId}: Endpoint not yet available, retrying...`);
        return { state: WaiterState.RETRY };
      },
    );
  } catch (error) {
    console.error(`${instanceId}: Failed to retrieve database endpoint:`, error);
    throw error;
  }
  console.log(`${instanceId}: Retrieved endpoint: ${dbEndpoint.DBInstances[0].Endpoint.Address}`);

  try {
    const awsResources = readAwsResources() ?? {};
    awsResources.dbs = [...(awsResources.dbs ?? []), instanceId];
    writeAwsResources(awsResources);
    console.log("Updated awsResources with DB information");
  } catch (error) {
    console.warn("Failed to update awsResources with DB information:", error);
  }

  const newDb = {
    type: dbType,
    instanceId: instanceId,
    database: "postgres",
    host: dbEndpoint.DBInstances[0].Endpoint.Address,
    user: myDbConfig.MasterUsername,
    password: myDbConfig.MasterUserPassword,
    port: myDbConfig.Port,
  };

  // Write immediately so credentials aren't lost if the other DB creation fails
  try {
    const pushkinConfig = loadPushkinConfig();
    if (pushkinConfig.databases.production == null) {
      pushkinConfig.databases.production = {};
    }
    pushkinConfig.databases.production[newDb.type] = newDb;
    await savePushkinConfig(pushkinConfig);
    console.log(`${instanceId}: Recorded to pushkin.yaml`);
  } catch (error) {
    console.error(`${instanceId}: Failed to record to pushkin.yaml:`, error);
    throw error;
  }

  console.log(`${instanceId}: Returning created database object:`, newDb);
  return newDb;
}

/**
 * Retrieve connection information about all production databases from pushkin.yaml.
 * @returns {Promise<object>} - The database connection details keyed by database type
 */
async function getDbsInfo() {
  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  // Check if databases.production exists and is an object
  if (
    !pushkinConfig.databases.production ||
    typeof pushkinConfig.databases.production !== "object"
  ) {
    throw new Error(
      `Error: No databases.production found in pushkin.yaml. This suggests database creation did not complete properly.`,
    );
  }

  const dbKeys = Object.keys(pushkinConfig.databases.production);

  // Check if there's at least one database
  if (dbKeys.length === 0) {
    throw new Error(
      `Error: databases.production exists but is empty in pushkin.yaml. This suggests database creation did not complete properly.`,
    );
  }

  console.log(`Found ${dbKeys.length} database(s) in pushkin.yaml`);

  // Build database info object keyed by type
  const dbsByType = {};
  for (const key of dbKeys) {
    const db = pushkinConfig.databases.production[key];

    // Validate that the database has required fields
    if (!db.type) {
      console.warn(`Warning: Database entry "${key}" missing type field, skipping...`);
      continue;
    }

    if (!db.database || !db.user || !db.password || !db.port || !db.host) {
      console.warn(
        `Warning: Database "${key}" (type: ${db.type}) missing required fields, skipping...`,
      );
      continue;
    }

    dbsByType[db.type] = {
      database: db.database,
      user: db.user,
      password: db.password,
      port: db.port,
      host: db.host,
    };

    console.log(`Loaded ${db.type} database: ${db.database}`);
  }

  // Final check - ensure we have at least one valid database after filtering
  if (Object.keys(dbsByType).length === 0) {
    throw new Error(
      `Error: No valid databases found in pushkin.yaml. All database entries are missing required fields.`,
    );
  }

  return dbsByType;
}

/**
 * Get list of databases to delete.
 * @param {string|null} killTag - Whether to delete only DBs tagged with project tag
 * @returns {Promise<Array<string>>} - List of database identifiers to delete
 */
async function getDbsToDelete(killTag) {
  let dbInstances;
  try {
    const rdsClient = createRDSClient();
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    dbInstances = response.DBInstances ?? [];
  } catch (error) {
    console.error(`Unable to list databases:`, error);
    throw error;
  }

  return dbInstances
    .filter(
      (db) =>
        !killTag || db.TagList?.some((tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === killTag),
    )
    .map((db) => db.DBInstanceIdentifier);
}

async function disableDeletionProtection(instanceId, rdsClient) {
  await rdsClient.send(
    new ModifyDBInstanceCommand({
      DBInstanceIdentifier: instanceId,
      DeletionProtection: false,
      ApplyImmediately: true,
    }),
  );
}

async function waitForDeletionProtectionDisabled(instanceId, rdsClient) {
  const { deletionProtection } = loadAwsConfig().timeouts.rds;
  await createWaiter(
    {
      client: rdsClient,
      maxWaitTime: Math.floor(deletionProtection.timeoutMs / 1000),
      minDelay: deletionProtection.checkInterval,
      maxDelay: deletionProtection.checkInterval,
    },
    { DBInstanceIdentifier: instanceId },
    async (client, input) => {
      try {
        const response = await client.send(new DescribeDBInstancesCommand(input));
        if (response.DBInstances?.[0]?.DeletionProtection === false) {
          return { state: WaiterState.SUCCESS };
        }
        console.log(`Waiting for deletion protection to be disabled for ${instanceId}...`);
        return { state: WaiterState.RETRY };
      } catch (error) {
        console.warn(
          `Database ${instanceId} no longer exists (may have been deleted externally):`,
          error,
        );
        return { state: WaiterState.SUCCESS };
      }
    },
  );
}

async function deleteSingleDB(instanceId, rdsClient) {
  try {
    const response = await rdsClient.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId }),
    );
    const dbStatus = response.DBInstances?.[0]?.DBInstanceStatus;

    if (dbStatus === "deleting") {
      console.log(`Database ${instanceId} already being deleted`);
      return;
    }

    console.log(`Deleting database ${instanceId}`);
    await rdsClient.send(
      new DeleteDBInstanceCommand({
        DBInstanceIdentifier: instanceId,
        SkipFinalSnapshot: true,
      }),
    );
  } catch (error) {
    if (error.message.includes("already being deleted")) {
      console.warn(`Database ${instanceId} already being deleted`);
    } else {
      console.error(`Failed to delete database ${instanceId}:`, error);
      throw error;
    }
  }
}

async function waitForDBsDeletion(instanceIds, rdsClient) {
  console.log(`Waiting for ${instanceIds.length} database(s) to be deleted...`);
  const { deletion } = loadAwsConfig().timeouts.rds;

  await Promise.all(
    instanceIds.map(async (instanceId) => {
      try {
        await waitUntilDBInstanceDeleted(
          {
            client: rdsClient,
            maxWaitTime: Math.floor(deletion.timeoutMs / 1000),
            minDelay: deletion.minDelay,
            maxDelay: deletion.maxDelay,
          },
          { DBInstanceIdentifier: instanceId },
        );
        console.log(`Database ${instanceId} confirmed deleted`);
      } catch (error) {
        if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
          throw new Error(
            `Timeout waiting for ${instanceId} to be deleted after ${deletion.timeoutMs / 1000}s`,
          );
        }
        throw error;
      }
    }),
  );

  console.log(`All target databases confirmed deleted`);
  return true;
}

/**
 * Delete specified list of databases.
 * @param {Promise<Array<string>>} instanceIds - Promise that resolves to list of RDS instance IDs
 * @returns {Promise<boolean>} - Promise that resolves when databases are deleted
 */
async function deleteDbs(instanceIds) {
  const resolvedInstanceIds = await instanceIds;

  if (resolvedInstanceIds.length === 0) {
    console.log(`No databases to delete.`);
    return true;
  }

  const rdsClient = createRDSClient();

  console.log(`Checking which databases exist: ${resolvedInstanceIds.join(", ")}`);
  const existingInRds = await Promise.all(
    resolvedInstanceIds.map((instanceId) => findDbInRds(instanceId, rdsClient)),
  );
  const existingInstanceIds = resolvedInstanceIds.filter((_, i) => existingInRds[i]);

  if (existingInstanceIds.length === 0) {
    console.log(`No databases to delete (all already deleted).`);
    return true;
  }

  console.log(`Disabling deletion protection for ${existingInstanceIds.length} database(s)...`);
  await Promise.all(
    existingInstanceIds.map(async (instanceId) => {
      try {
        await disableDeletionProtection(instanceId, rdsClient);
        await waitForDeletionProtectionDisabled(instanceId, rdsClient);
      } catch (error) {
        console.error(`Failed to disable deletion protection for ${instanceId}:`, error);
        throw error;
      }
    }),
  );

  console.log(`Deleting ${existingInstanceIds.length} database(s)...`);
  await Promise.all(
    existingInstanceIds.map(async (instanceId) => {
      try {
        await deleteSingleDB(instanceId, rdsClient);
      } catch (error) {
        console.error(`Failed to delete ${instanceId}:`, error);
        throw error;
      }
    }),
  );

  console.log(`Waiting for databases to be fully deleted...`);
  await waitForDBsDeletion(existingInstanceIds, rdsClient);

  return true;
}

export { createDb, getDbsInfo, getDbsToDelete, deleteDbs };
