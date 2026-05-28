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
import { loadAwsConfig } from "../utils/aws-config.js";
import { readAwsResources, writeAwsResources } from "../utils/aws-resources.js";
import { dbConfig } from "../awsConfigs.js";
import { AWS_REGION, PROJECT_TAG_KEY } from "../constants.js";

function createRDSClient(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(RDSClient);
}

async function findDbInRds(dbName, awsProfileName, rdsClient = null) {
  try {
    if (!rdsClient) {
      rdsClient = createRDSClient(awsProfileName);
    }
    const response = await rdsClient.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbName }),
    );
    return response.DBInstances?.[0] ?? null;
  } catch (error) {
    if (error.name === "DBInstanceNotFound") {
      return null; // Database does not exist
    } else {
      console.error(`Unable to find database ${dbName} in RDS:`, error);
      throw error;
    }
  }
}

function validateDbMatch(dbType, pushkinConfig, rdsDb) {
  const yamlDb = pushkinConfig.productionDBs[dbType];
  const mismatches = [];
  // Maps pushkin.yaml fields to their AWS RDS API equivalents for validation.
  // yamlPath/rdsPath use dot-notation for nested traversal (e.g. "Endpoint.Port").
  // required: false skips comparison when RDS returns null; true treats null as a mismatch.
  const dbFieldMappings = [
    {
      name: "Database name",
      yamlPath: "name",
      rdsPath: "DBName",
      required: false, // some engines return null DBName
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

async function checkIfDbShouldBeCreated(dbName, dbType, awsProfileName) {
  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  const inYAML =
    pushkinConfig.productionDBs &&
    Object.keys(pushkinConfig.productionDBs).includes(dbType) &&
    pushkinConfig.productionDBs[dbType].name === dbName;

  const rdsDb = await findDbInRds(dbName, awsProfileName);

  if (inYAML && rdsDb) {
    // Case 1: In both YAML and RDS - validate they match
    console.warn(`${dbName} found in both pushkin.yaml and RDS. Validating configuration...`);
    const mismatches = validateDbMatch(dbType, pushkinConfig, rdsDb);

    if (mismatches.length === 0) {
      console.log(
        `${dbName} is already configured on RDS. Skipping creation.\n` +
          `⚠️  Note: If database connection fails, the password in pushkin.yaml may be incorrect.\n` +
          `To fix: Go to AWS Console → RDS → Modify database → Set new master password → Update pushkin.yaml`,
      );
      return false;
    } else {
      const error = new Error(
        `Database parameter mismatch: ${dbName} exists in RDS but with different configuration than pushkin.yaml\n\n` +
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
    console.warn(`${dbName} listed in pushkin.yaml but not found on RDS. Creating...`);
    return true;
  } else if (!inYAML && rdsDb) {
    // Case 3: In RDS but not YAML - conflict!
    const error = new Error(
      `Database conflict: ${dbName} exists in RDS but not in pushkin.yaml. ` +
        `You need to either delete the database from RDS or add its credentials to pushkin.yaml.`,
    );
    console.error(error);
    throw error;
  } else {
    // Case 4: Not in YAML, not in RDS - create new
    return true;
  }
}

async function getDbConfig(dbName, dbType, verbose) {
  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }
  if (verbose) {
    console.log(
      `${dbName}: Returning existing database config:`,
      pushkinConfig.productionDBs[dbType],
    );
  }
  return pushkinConfig.productionDBs[dbType];
}

/**
 * Create a database (create new or return existing).
 * Orchestrates the entire database creation process:
 * 1. Generate database name
 * 2. Check if database should be created (validates against RDS and pushkin.yaml)
 * 3. Either create new database or return existing configuration
 * @param {string} dbType - The type of database (e.g., "Main", "Transaction")
 * @param {string} securityGroupID - The security group ID for the database
 * @param {string} projectName - The project name
 * @param {string} awsProfileName - The IAM profile to use
 * @param {boolean} verbose - Whether to log detailed information
 * @returns {Promise<object>} - The database configuration object
 */
async function createDb(dbType, securityGroupID, projectName, awsProfileName, verbose = false) {
  console.log(`Creating ${dbType} database.`);
  const dbName = projectName
    .concat(dbType)
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase(); // lowercase + alphanumeric to match RDS DB names

  const shouldCreate = await checkIfDbShouldBeCreated(dbName, dbType, awsProfileName);
  if (!shouldCreate) {
    // Get existing DB's configuration from pushkin.yaml
    return await getDbConfig(dbName, dbType, verbose);
  }
  // Create a new DB and return its configuration
  const dbPassword = crypto.randomBytes(16).toString("base64url").slice(0, 16);
  const myDbConfig = structuredClone(dbConfig);
  myDbConfig.DBName = dbName;
  myDbConfig.DBInstanceIdentifier = dbName;
  myDbConfig.VpcSecurityGroupIds = [securityGroupID];
  myDbConfig.MasterUserPassword = dbPassword;
  myDbConfig.Tags = [{ Key: PROJECT_TAG_KEY, Value: projectName }];

  const rdsClient = createRDSClient(awsProfileName);

  try {
    await rdsClient.send(new CreateDBInstanceCommand(myDbConfig));
  } catch (error) {
    console.error(`Unable to create database ${dbName}:`, error);
    throw error;
  }

  if (verbose) {
    console.log(
      `Database ${dbName} created with the following configuration:\n${JSON.stringify(myDbConfig, null, 2)}`,
    );
  } else {
    console.log(`Database ${dbName} created.`);
  }

  // Wait for database to be available with timeout
  try {
    console.log(
      `Waiting for ${dbName} to spool up. This may take a while, but will timeout if not completed within 20 minutes...`,
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
      { DBInstanceIdentifier: dbName },
    );
    const waitTime = Date.now() - waitStart;
    console.log(
      `${dbName} is spooled up after ${Math.floor(waitTime / 60000)} minutes ${Math.floor((waitTime % 60000) / 1000)} seconds!`,
    );
  } catch (error) {
    if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
      console.warn(`Warning: spooling up ${dbName} timed out after 20 minutes.`);
    } else {
      console.warn(`Warning: spooling up ${dbName} failed with error:`, error);
    }
  }

  let dbEndpoint;
  console.log(`${dbName}: Retrieving database endpoint...`);
  const { endpoint } = loadAwsConfig().timeouts.rds;
  try {
    await createWaiter(
      {
        client: createRDSClient(awsProfileName),
        maxWaitTime: endpoint.maxWaitTime,
        minDelay: endpoint.minDelay,
        maxDelay: endpoint.maxDelay,
      },
      { DBInstanceIdentifier: dbName },
      async (client, input) => {
        const response = await client.send(new DescribeDBInstancesCommand(input));
        if (response?.DBInstances?.[0]?.Endpoint?.Address) {
          dbEndpoint = response;
          return { state: WaiterState.SUCCESS };
        }
        console.log(`${dbName}: Endpoint not yet available, retrying...`);
        return { state: WaiterState.RETRY };
      },
    );
  } catch (error) {
    console.error(`${dbName}: Failed to retrieve database endpoint:`, error);
    throw error;
  }
  console.log(`${dbName}: Retrieved endpoint: ${dbEndpoint.DBInstances[0].Endpoint.Address}`);

  // Update list of AWS resources
  try {
    const awsResources = readAwsResources() ?? {};
    awsResources.dbs = [...(awsResources.dbs ?? []), dbName];
    writeAwsResources(awsResources);
    console.log("Updated awsResources with DB information");
  } catch (error) {
    console.warn("Failed to update awsResources with DB information:", error);
  }

  const newDb = {
    type: dbType,
    name: dbName,
    host: dbEndpoint.DBInstances[0].Endpoint.Address,
    url: dbEndpoint.DBInstances[0].Endpoint.Address, // This is same as 'host' for AWS, but different for local deploy in Docker
    user: myDbConfig.MasterUsername,
    pass: myDbConfig.MasterUserPassword,
    port: myDbConfig.Port,
  };

  console.log(`${dbName}: Returning created database object:`, newDb);
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

  // Check if productionDBs exists and is an object
  if (!pushkinConfig.productionDBs || typeof pushkinConfig.productionDBs !== "object") {
    throw new Error(
      `Error: No productionDBs found in pushkin.yaml. This suggests database creation did not complete properly.`,
    );
  }

  const dbKeys = Object.keys(pushkinConfig.productionDBs);

  // Check if there's at least one database
  if (dbKeys.length === 0) {
    throw new Error(
      `Error: productionDBs exists but is empty in pushkin.yaml. This suggests database creation did not complete properly.`,
    );
  }

  console.log(`Found ${dbKeys.length} database(s) in pushkin.yaml`);

  // Build database info object keyed by type
  const dbsByType = {};
  for (const key of dbKeys) {
    const db = pushkinConfig.productionDBs[key];

    // Validate that the database has required fields
    if (!db.type) {
      console.warn(`Warning: Database entry "${key}" missing type field, skipping...`);
      continue;
    }

    if (!db.name || !db.user || !db.pass || !db.port || !db.host) {
      console.warn(
        `Warning: Database "${key}" (type: ${db.type}) missing required fields, skipping...`,
      );
      continue;
    }

    dbsByType[db.type] = {
      name: db.name,
      user: db.user,
      pass: db.pass,
      port: db.port,
      host: db.host,
    };

    console.log(`Loaded ${db.type} database: ${db.name}`);
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
 * Record databases in pushkin.yaml.
 * WHY: When we create databases, we get the connection information back in this function.
 * This information needs to be recorded in pushkin.yaml so that the application can connect to the databases.
 * We wait to record the databases until they are created and we have all the necessary information
 * (e.g. host and port) to avoid having incomplete database entries in pushkin.yaml if something goes wrong during creation.
 * @param {Promise<Array>} dbDone - A promise that resolves to an array of database objects
 * @returns {Promise<object>} - The updated pushkin configuration
 */
async function recordDbs(dbDone) {
  console.log("recordDbs: Waiting for database promises to resolve...");

  const { recording } = loadAwsConfig().timeouts.rds;
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(`Database recording timeout after ${recording.timeoutMs / 60000} minutes`),
        ),
      recording.timeoutMs,
    ),
  );

  try {
    const databases = await Promise.race([dbDone, timeout]);

    if (!Array.isArray(databases)) {
      throw new Error(`Expected array of databases, got: ${typeof databases}`);
    }

    if (databases.length === 0) {
      throw new Error(`No new databases were created, received empty array.`);
    }

    console.log(`recordDbs: Received ${databases.length} database(s)`);

    databases.forEach((db, index) => {
      console.log(`recordDbs: Database ${index} (${db?.type || "unknown"}):`, db);
    });

    console.log(
      `All ${databases.length} databases created successfully. Adding to pushkin.yaml...`,
    );
    let pushkinConfig;
    try {
      pushkinConfig = loadPushkinConfig();
    } catch (error) {
      console.error(`Failed to load pushkin.yaml:`, error);
      throw error;
    }

    // Initialize productionDBs if it doesn't exist
    if (pushkinConfig.productionDBs == null) {
      pushkinConfig.productionDBs = {};
    }

    // Record all databases using their type as the key
    databases.forEach((db) => {
      if (db && db.type) {
        pushkinConfig.productionDBs[db.type] = db;
        console.log(`Recorded ${db.type} database: ${db.name}`);
      } else {
        console.warn(`Skipping database with missing type:`, db);
      }
    });

    try {
      await savePushkinConfig(pushkinConfig);
      console.log(`Successfully updated pushkin.yaml with ${databases.length} database(s).`);
    } catch (error) {
      console.error(`Failed to write pushkin.yaml:`, error);
      throw error;
    }

    return pushkinConfig;
  } catch (error) {
    console.error("recordDbs: Error or timeout occurred:", error);
    throw error;
  }
}

/**
 * Get list of databases to delete.
 * @param {string} awsProfileName - The IAM profile to use
 * @param {string|null} killTag - Whether to delete only DBs tagged with project tag
 * @returns {Promise<Array<string>>} - List of database identifiers to delete
 */
async function getDbsToDelete(awsProfileName, killTag) {
  let dbInstances;
  try {
    const rdsClient = createRDSClient(awsProfileName);
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    dbInstances = response.DBInstances ?? [];
  } catch (error) {
    console.error(`Unable to list databases:`, error);
    throw error;
  }

  return dbInstances
    .filter(
      (db) =>
        !killTag ||
        db.TagList?.some((tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === killTag),
    )
    .map((db) => db.DBInstanceIdentifier);
}

async function disableDeletionProtection(dbName, rdsClient) {
  await rdsClient.send(
    new ModifyDBInstanceCommand({
      DBInstanceIdentifier: dbName,
      DeletionProtection: false,
      ApplyImmediately: true,
    }),
  );
}

async function waitForDeletionProtectionDisabled(dbName, rdsClient) {
  const { deletionProtection } = loadAwsConfig().timeouts.rds;
  await createWaiter(
    {
      client: rdsClient,
      maxWaitTime: Math.floor(deletionProtection.timeoutMs / 1000),
      minDelay: deletionProtection.checkInterval,
      maxDelay: deletionProtection.checkInterval,
    },
    { DBInstanceIdentifier: dbName },
    async (client, input) => {
      try {
        const response = await client.send(new DescribeDBInstancesCommand(input));
        if (response.DBInstances?.[0]?.DeletionProtection === false) {
          return { state: WaiterState.SUCCESS };
        }
        console.log(`Waiting for deletion protection to be disabled for ${dbName}...`);
        return { state: WaiterState.RETRY };
      } catch (error) {
        console.warn(
          `Database ${dbName} no longer exists (may have been deleted externally):`,
          error,
        );
        return { state: WaiterState.SUCCESS };
      }
    },
  );
}

async function deleteSingleDB(dbName, rdsClient) {
  try {
    const response = await rdsClient.send(
      new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbName }),
    );
    const dbStatus = response.DBInstances?.[0]?.DBInstanceStatus;

    if (dbStatus === "deleting") {
      console.log(`Database ${dbName} already being deleted`);
      return;
    }

    console.log(`Deleting database ${dbName}`);
    await rdsClient.send(
      new DeleteDBInstanceCommand({
        DBInstanceIdentifier: dbName,
        SkipFinalSnapshot: true,
      }),
    );
  } catch (error) {
    if (error.message.includes("already being deleted")) {
      console.warn(`Database ${dbName} already being deleted`);
    } else {
      console.error(`Failed to delete database ${dbName}:`, error);
      throw error;
    }
  }
}

async function waitForDBsDeletion(dbNames, rdsClient) {
  console.log(`Waiting for ${dbNames.length} database(s) to be deleted...`);
  const { deletion } = loadAwsConfig().timeouts.rds;

  // Wait for each database to be deleted in parallel
  await Promise.all(
    dbNames.map(async (dbName) => {
      try {
        await waitUntilDBInstanceDeleted(
          {
            client: rdsClient,
            maxWaitTime: Math.floor(deletion.timeoutMs / 1000),
            minDelay: deletion.minDelay,
            maxDelay: deletion.maxDelay,
          },
          { DBInstanceIdentifier: dbName },
        );
        console.log(`Database ${dbName} confirmed deleted`);
      } catch (error) {
        if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
          throw new Error(
            `Timeout waiting for ${dbName} to be deleted after ${deletion.timeoutMs / 1000}s`,
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
 * @param {Promise<Array<string>>} dbs - Promise that resolves to list of database identifiers
 * @param {string} awsProfileName - The IAM profile to use
 * @returns {Promise<boolean>} - Promise that resolves when databases are deleted
 */
async function deleteDbs(dbs, awsProfileName) {
  const resolvedDbs = await dbs;

  if (resolvedDbs.length === 0) {
    console.log(`No databases to delete.`);
    return true;
  }

  const rdsClient = createRDSClient(awsProfileName);

  console.log(`Checking which databases exist: ${resolvedDbs.join(", ")}`);
  const existingDbsInRds = await Promise.all(
    resolvedDbs.map((dbName) => findDbInRds(dbName, awsProfileName, rdsClient)),
  );
  const existingDbs = resolvedDbs.filter((_, i) => existingDbsInRds[i]);

  if (existingDbs.length === 0) {
    console.log(`No databases to delete (all already deleted).`);
    return true;
  }

  console.log(`Disabling deletion protection for ${existingDbs.length} database(s)...`);
  await Promise.all(
    existingDbs.map(async (dbName) => {
      try {
        await disableDeletionProtection(dbName, rdsClient);
        await waitForDeletionProtectionDisabled(dbName, rdsClient);
      } catch (error) {
        console.error(`Failed to disable deletion protection for ${dbName}:`, error);
        throw error;
      }
    }),
  );

  console.log(`Deleting ${existingDbs.length} database(s)...`);
  await Promise.all(
    existingDbs.map(async (dbName) => {
      try {
        await deleteSingleDB(dbName, rdsClient);
      } catch (error) {
        console.error(`Failed to delete ${dbName}:`, error);
        throw error;
      }
    }),
  );

  console.log(`Waiting for databases to be fully deleted...`);
  await waitForDBsDeletion(existingDbs, rdsClient);

  return true;
}

export { createDb, getDbsInfo, recordDbs, getDbsToDelete, deleteDbs };
