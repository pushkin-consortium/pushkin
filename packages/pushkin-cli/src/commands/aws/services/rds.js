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
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { readAwsResources, writeAwsResources } from "../utils/aws-resources.js";
import { loadPushkinConfig, savePushkinConfig } from "../utils/config.js";
import { AWS_REGION } from "../constants.js";
import { dbConfig } from "../awsConfigs.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * (Helper)
 * Creates an RDS client with consistent configuration
 */
const createRDSClient = (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  return factory.createClient(RDSClient);
};

/**
 * (Helper)
 * Generate database name from project name and database type
 */
const generateDBName = (projName, dbType) => {
  return projName
    .concat(dbType)
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase(); // lowercase + alphanumeric to match RDS DB names
};

/**
 * (Helper)
 * Generate a secure random password for databases
 */
const generateSecurePassword = () => {
  return crypto.randomBytes(16).toString("base64url").slice(0, 16);
};

/**
 * (Helper)
 * Check if database exists in RDS
 */
const findDBInRDS = async (dbName, useIAM) => {
  try {
    const rdsClient = createRDSClient(useIAM);
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    return response.DBInstances.find((db) => db.DBInstanceIdentifier === dbName.toLowerCase());
  } catch (error) {
    console.error(`Unable to get list of RDS databases:`, error);
    throw error;
  }
};

/**
 * (Helper)
 * Get nested property from object using dot notation
 * @param {object} obj - The object to traverse
 * @param {string} path - Dot-notation path (e.g., "Endpoint.Port")
 * @returns {*} The value at the specified path, or undefined if not found
 */
const getNestedValue = (obj, path) => {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
};

/**
 * (Helper)
 * Validate that RDS database matches pushkin.yaml configuration
 * @param {string} dbType - The database type (e.g., "transaction", "messageQueue")
 * @param {object} pushkinConfig - The parsed pushkin.yaml configuration
 * @param {object} rdsDB - The RDS database instance description from AWS
 * @returns {Array<string>} List of mismatch descriptions (empty if all match)
 */
const validateDBMatch = (dbType, pushkinConfig, rdsDB) => {
  const yamlDB = pushkinConfig.productionDBs[dbType];
  const mismatches = [];

  /**
   * Field mapping between pushkin.yaml and RDS API response
   * Each entry defines how to compare a field between the two sources
   */
  const DB_FIELD_MAPPINGS = [
    {
      name: "Database name",
      yamlPath: "name",
      rdsPath: "DBName",
      required: false, // Some engines may have null DBName
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
      transform: (val) => Number(val),
    },
    {
      name: "Host",
      yamlPath: "host",
      rdsPath: "Endpoint.Address",
      required: true,
    },
  ];

  for (const mapping of DB_FIELD_MAPPINGS) {
    const yamlValue = getNestedValue(yamlDB, mapping.yamlPath);
    let rdsValue = getNestedValue(rdsDB, mapping.rdsPath);

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
};

/**
 * (Helper)
 * Determine if a new database of given name and type should be created
 * Four cases:
 * 1. In both YAML and RDS – validate they match
 * 2. In YAML but not RDS – recreate in RDS
 * 3. In RDS but not in YAML – throw error
 * 4. Not in YAML or RDS – create new
 */
const shouldCreateNewDB = async (dbName, dbType, useIAM) => {
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  const inYAML =
    pushkinConfig.productionDBs &&
    Object.keys(pushkinConfig.productionDBs).includes(dbType) &&
    pushkinConfig.productionDBs[dbType].name === dbName;

  const rdsDB = await findDBInRDS(dbName, useIAM);

  if (inYAML && rdsDB) {
    // Case 1: In both YAML and RDS - validate they match
    console.warn(`${dbName} found in both pushkin.yaml and RDS. Validating configuration...`);
    const mismatches = validateDBMatch(dbType, pushkinConfig, rdsDB);

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
  } else if (inYAML && !rdsDB) {
    // Case 2: In YAML but not RDS - recreate it
    console.warn(`${dbName} listed in pushkin.yaml but not found on RDS. Creating...`);
    return true;
  } else if (!inYAML && rdsDB) {
    // Case 3: In RDS but not YAML - conflict!
    const error = new Error(
      `Database conflict: ${dbName} exists in RDS but not in pushkin.yaml. ` +
        `You need to either delete the database from RDS or add its credentials to pushkin.yaml.`,
    );
    console.error("\x1b[31m%s\x1b[0m", error);
    throw error;
  } else {
    // Case 4: Not in YAML, not in RDS - create new
    return true;
  }
};

/**
 * (Helper)
 * Create an RDS database instance with the specified configuration
 */
const createRDSDatabase = async (
  dbName,
  dbType,
  securityGroupID,
  projName,
  useIAM,
  verbose = false,
) => {
  const dbPassword = generateSecurePassword();
  let myDBConfig = JSON.parse(JSON.stringify(dbConfig));
  myDBConfig.DBName = dbName;
  myDBConfig.DBInstanceIdentifier = dbName.toLowerCase();
  myDBConfig.VpcSecurityGroupIds = [securityGroupID];
  myDBConfig.MasterUserPassword = dbPassword;
  myDBConfig.Tags = [{ Key: PROJECT_TAG_KEY, Value: projName }];

  // Create database
  try {
    const rdsClient = createRDSClient(useIAM);
    await rdsClient.send(new CreateDBInstanceCommand(myDBConfig));
  } catch (error) {
    console.error(`Unable to create database ${dbName}:`, error);
    throw error;
  }

  if (verbose) {
    console.log(
      `Database ${dbName} created with the following configuration:\n${JSON.stringify(myDBConfig, null, 2)}`,
    );
  } else {
    console.log(`Database ${dbName} created.`);
  }

  // Wait for database to be available with timeout
  try {
    const rdsClient = createRDSClient(useIAM);
    console.log(
      `Waiting for ${dbName} to spool up. This may take a while, but will timeout if not completed within 20 minutes...`,
    );
    const waitStart = Date.now();
    await waitUntilDBInstanceAvailable(
      {
        client: rdsClient,
        maxWaitTime: 1200, // 20 minutes timeout
        minDelay: 10, // Check every 10 seconds
        maxDelay: 20, // Maximum 20 seconds between checks
      },
      { DBInstanceIdentifier: dbName.toLowerCase() },
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

  // Try to connect to RDS database endpoint
  let dbEndpoint;
  let retryCount = 0;
  const maxRetries = 3;

  console.log(`${dbName}: Attempting to get database endpoint from RDS...`);
  const dbInstanceIdentifier = dbName.toLowerCase();
  const rdsClient = createRDSClient(useIAM);
  while (retryCount < maxRetries) {
    try {
      console.log(`(attempt ${retryCount + 1}/${maxRetries})...`);
      dbEndpoint = await rdsClient.send(
        new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceIdentifier }),
      );
      if (dbEndpoint?.DBInstances?.[0]?.Endpoint?.Address) {
        console.log(
          `${dbName}: Successfully retrieved database endpoint: ${dbEndpoint.DBInstances[0].Endpoint.Address}`,
        );
        break;
      } else {
        throw new Error("Database endpoint not yet available.");
      }
    } catch (error) {
      retryCount++;
      console.warn(`${dbName}: Attempt ${retryCount} failed to get endpoint:`, error);

      if (retryCount >= maxRetries) {
        console.error(`${dbName}: Failed to get database endpoint after ${maxRetries} attempts`);
        throw error;
      }

      console.log(`${dbName}: Waiting 30 seconds before retry...`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  // Update list of AWS resources
  try {
    const awsResources = readAwsResources();
    if (awsResources && awsResources.dbs) {
      awsResources.dbs.push(dbName);
    } else {
      awsResources.dbs = [dbName];
    }
    writeAwsResources(awsResources);
    console.log("Updated awsResources with DB information");
  } catch (error) {
    console.error(`Unable to update awsResources.js:`, error);
  }

  const newDB = {
    type: dbType,
    name: dbName,
    host: dbEndpoint.DBInstances[0].Endpoint.Address,
    url: dbEndpoint.DBInstances[0].Endpoint.Address, // This is same as 'host' for AWS, but different for local deploy in Docker
    user: myDBConfig.MasterUsername,
    pass: myDBConfig.MasterUserPassword,
    port: myDBConfig.Port,
  };

  console.log(`${dbName}: Returning created database object:`, newDB);
  return newDB;
};

/**
 * (Helper)
 * Get existing database configuration from pushkin.yaml
 */
const getExistingDBConfig = async (dbName, dbType, verbose = false) => {
  console.log(`${dbName}: Database already exists, returning existing config`);
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
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
};

/**
 * Initialize a database (create new or return existing)
 * Orchestrates the entire database initialization process:
 * 1. Generate database name
 * 2. Check if database should be created (validates against RDS and pushkin.yaml)
 * 3. Either create new database or return existing configuration
 * @param {string} dbType - The type of database (e.g., 'postgres', 'mysql')
 * @param {string} securityGroupID - The security group ID for the database
 * @param {string} projName - The project name
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<object>} - The database connection details
 */
const initDB = async (dbType, securityGroupID, projName, useIAM) => {
  console.log(`Initializing ${dbType} database.`);

  const dbName = generateDBName(projName, dbType);
  const shouldCreate = await shouldCreateNewDB(dbName, dbType, useIAM);

  if (shouldCreate) {
    return await createRDSDatabase(dbName, dbType, securityGroupID, projName, useIAM);
  } else {
    return await getExistingDBConfig(dbName, dbType);
  }
};

/**
 * Retrieve connection information about all production databases from pushkin.yaml
 * @returns {Promise<object>} - The database connection details keyed by database type
 */
const getDBInfo = async () => {
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
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
  dbKeys.forEach((key) => {
    const db = pushkinConfig.productionDBs[key];

    // Validate that the database has required fields
    if (!db.type) {
      console.warn(`Warning: Database entry "${key}" missing type field, skipping...`);
      return;
    }

    if (!db.name || !db.user || !db.pass || !db.port || !db.host) {
      console.warn(
        `Warning: Database "${key}" (type: ${db.type}) missing required fields, skipping...`,
      );
      return;
    }

    dbsByType[db.type] = {
      name: db.name,
      username: db.user,
      password: db.pass,
      port: db.port,
      endpoint: db.host,
    };

    console.log(`Loaded ${db.type} database: ${db.name}`);
  });

  // Final check - ensure we have at least one valid database after filtering
  if (Object.keys(dbsByType).length === 0) {
    throw new Error(
      `Error: No valid databases found in pushkin.yaml. All database entries are missing required fields.`,
    );
  }

  return dbsByType;
};

/**
 * Record databases in pushkin.yaml
 * WHY: When we create databases, we get the connection information back in this function.
 * This information needs to be recorded in pushkin.yaml so that the application can connect to the databases.
 * We wait to record the databases until they are created and we have all the necessary information
 * (e.g. host and port) to avoid having incomplete database entries in pushkin.yaml if something goes wrong during creation
 * @param {Promise<Array>} dbDone - A promise that resolves to an array of database objects
 * @returns {Promise<object>} - The updated pushkin configuration
 */
const recordDBs = async (dbDone) => {
  console.log("recordDBs: Waiting for database promises to resolve...");

  // Add timeout to prevent indefinite hanging (30 minutes)
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Database recording timeout after 30 minutes")),
      30 * 60 * 1000,
    ),
  );

  try {
    const databases = await Promise.race([dbDone, timeout]);

    if (!Array.isArray(databases)) {
      throw new Error(`Expected array of databases, got: ${typeof databases}`);
    }

    if (databases.length ===0) {
      throw new Error(`No new databases were created, received empty array.`);
    }

    console.log(`recordDBs: Received ${databases.length} database(s)`);

    databases.forEach((db, index) => {
      console.log(`recordDBs: Database ${index} (${db?.type || "unknown"}):`, db);
    });

    console.log(
      `All ${databases.length} databases created successfully. Adding to pushkin.yaml...`,
    );
    let pushkinConfig;
    try {
      pushkinConfig = await loadPushkinConfig();
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
    console.error("recordDBs: Error or timeout occurred:", error);
    throw error;
  }
};

/**
 * Get list of databases to delete
 * @param {string} useIAM - The IAM profile to use
 * @param {string} killTag - Whether to delete only DBs tagged with project tag
 * @returns {Promise<Array<string>>} - List of database identifiers to delete
 */
const getDBsToDelete = async (useIAM, killTag) => {
  const dbs = [];
  let dbInstances;
  try {
    const rdsClient = createRDSClient(useIAM);
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    dbInstances = response.DBInstances || [];
  } catch (error) {
    console.error(`Unable to list databases:`, error);
    throw error;
  }

  dbInstances.forEach((db) => {
    // TODO: killize
    if (!killTag) {
      // Armageddon mode: delete all databases
      dbs.push(db.DBInstanceIdentifier);
    } else {
      // Kill mode: delete only databases tagged with the project name
      const hasProjectTag = db.TagList?.some(
        (tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === killTag,
      );
      if (hasProjectTag) {
        dbs.push(db.DBInstanceIdentifier);
      }
    }
  });
  return dbs;
};

/**
 * (Helper)
 * Check if database exists in RDS
 */
const checkDBExists = async (dbName, rdsClient) => {
  try {
    await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbName }));
    return true;
  } catch {
    return false;
  }
};

/**
 * (Helper)
 * Disable deletion protection for a single database
 */
const disableDeletionProtection = async (dbName, rdsClient) => {
  await rdsClient.send(
    new ModifyDBInstanceCommand({
      DBInstanceIdentifier: dbName.toLowerCase(),
      DeletionProtection: false,
      ApplyImmediately: true,
    }),
  );
};

/**
 * (Helper)
 * Wait until deletion protection is disabled for a database
 */
const waitForDeletionProtectionDisabled = async (dbName, rdsClient, timeoutMs = 300000) => {
  const checkProtection = async () => {
    while (true) {
      try {
        const response = await rdsClient.send(
          new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbName.toLowerCase() }),
        );

        if (response.DBInstances?.[0]?.DeletionProtection === false) {
          return true;
        }

        console.log(`Waiting for deletion protection to be disabled for ${dbName}...`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s intervals
      } catch (error) {
        console.warn(
          `Database ${dbName} no longer exists (may have been deleted externally):`,
          error,
        );
        return false;
      }
    }
  };

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(new Error(`Timeout waiting for deletion protection to be disabled for ${dbName}`)),
      timeoutMs,
    ),
  );

  return Promise.race([checkProtection(), timeout]);
};

/**
 * (Helper)
 * Delete a single database
 */
const deleteSingleDB = async (dbName, rdsClient) => {
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
};

/**
 * (Helper)
 * Wait until specific databases are fully deleted
 */
const waitForDBsDeletion = async (dbNames, rdsClient, timeoutMs = 1200000) => {
  console.log(`Waiting for ${dbNames.length} database(s) to be deleted...`);

  // Wait for each database to be deleted in parallel
  await Promise.all(
    dbNames.map(async (dbName) => {
      try {
        await waitUntilDBInstanceDeleted(
          {
            client: rdsClient,
            maxWaitTime: Math.floor(timeoutMs / 1000), // Convert ms to seconds
            minDelay: 20, // Check every 20 seconds
            maxDelay: 30, // Maximum 30 seconds between checks
          },
          { DBInstanceIdentifier: dbName },
        );
        console.log(`Database ${dbName} confirmed deleted`);
      } catch (error) {
        if (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout")) {
          throw new Error(`Timeout waiting for ${dbName} to be deleted after ${timeoutMs / 1000}s`);
        }
        throw error;
      }
    }),
  );

  console.log(`All target databases confirmed deleted`);
  return true;
};

/**
 * Delete specified list of databases
 * @param {Promise<Array<string>>} dbs - Promise that resolves to list of database identifiers
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<boolean>} - Promise that resolves when databases are deleted
 */
const deleteDBs = async (dbs, useIAM) => {
  dbs = await dbs;

  if (dbs.length === 0) {
    console.log(`No databases to delete.`);
    return true;
  }

  const rdsClient = createRDSClient(useIAM);

  console.log(`Checking which databases exist: ${dbs.join(", ")}`);
  const existingDBs = [];
  for (const dbName of dbs) {
    const exists = await checkDBExists(dbName, rdsClient);
    if (exists) {
      existingDBs.push(dbName);
    } else {
      console.log(`Database ${dbName} not found. Skipping.`);
    }
  }

  if (existingDBs.length === 0) {
    console.log(`No databases to delete (all already deleted).`);
    return true;
  }

  console.log(`Disabling deletion protection for ${existingDBs.length} database(s)...`);
  await Promise.all(
    existingDBs.map(async (dbName) => {
      try {
        await disableDeletionProtection(dbName, rdsClient);
        await waitForDeletionProtectionDisabled(dbName, rdsClient);
      } catch (error) {
        console.error(`Failed to disable deletion protection for ${dbName}:`, error);
        throw error;
      }
    }),
  );

  console.log(`Deleting ${existingDBs.length} database(s)...`);
  await Promise.all(
    existingDBs.map(async (dbName) => {
      try {
        await deleteSingleDB(dbName, rdsClient);
      } catch (error) {
        console.error(`Failed to delete ${dbName}:`, error);
        throw error;
      }
    }),
  );

  console.log(`Waiting for databases to be fully deleted...`);
  await waitForDBsDeletion(existingDBs, rdsClient);

  return true;
};

// Export all functions
export { initDB, getDBInfo, recordDBs, getDBsToDelete, deleteDBs };
