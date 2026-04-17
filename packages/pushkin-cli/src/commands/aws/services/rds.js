import crypto from "crypto";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  CreateDBInstanceCommand,
  ModifyDBInstanceCommand,
  DeleteDBInstanceCommand,
  waitUntilDBInstanceAvailable,
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
    .toLowerCase(); // lowercase, alphanumeric; matches RDS DB names
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
 * Validate that RDS database matches pushkin.yaml configuration
 * @returns {Array<string>} List of mismatch descriptions (empty if all match)
 */
const validateDBMatch = (dbType, pushkinConfig, rdsDB) => {
  const yamlDB = pushkinConfig.productionDBs[dbType];
  const mismatches = [];

  // Note: We compare DBName (the actual database name inside RDS instance)
  // Some engines may have null DBName, in which case we skip this validation
  if (rdsDB.DBName && yamlDB.name.toLowerCase() !== rdsDB.DBName.toLowerCase()) {
    mismatches.push(`Database name: RDS has "${rdsDB.DBName}", pushkin.yaml has "${yamlDB.name}"`);
  }
  if (yamlDB.user !== rdsDB.MasterUsername) {
    mismatches.push(`User: RDS has "${rdsDB.MasterUsername}", pushkin.yaml has "${yamlDB.user}"`);
  }
  if (yamlDB.port !== rdsDB.Endpoint.Port) {
    mismatches.push(`Port: RDS has ${rdsDB.Endpoint.Port}, pushkin.yaml has ${yamlDB.port}`);
  }
  if (yamlDB.host !== rdsDB.Endpoint.Address) {
    mismatches.push(`Host: RDS has "${rdsDB.Endpoint.Address}", pushkin.yaml has "${yamlDB.host}"`);
  }

  return mismatches;
};

/**
 * (Helper)
 * Determine if a new database of given name and type should be created
 */
const shouldCreateNewDB = async (dbName, dbType, useIAM) => {
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  // Check if DB is in pushkin.yaml
  const inYAML =
    pushkinConfig.productionDBs &&
    Object.keys(pushkinConfig.productionDBs).includes(dbType) &&
    pushkinConfig.productionDBs[dbType].name === dbName;

  // Query RDS once for this database
  const rdsDB = await findDBInRDS(dbName, useIAM);

  // Decision matrix based on (inYAML, inRDS)
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
    console.error(`Unable to create database ${dbType}:`, error);
    throw error;
  }

  if (verbose) {
    console.log(
      `Database ${dbType} created with the following configuration:\n${JSON.stringify(myDBConfig, null, 2)}`,
    );
  } else {
    console.log(`Database ${dbType} created.`);
  }

  // Wait for database to be available with timeout
  try {
    const rdsClient = createRDSClient(useIAM);

    console.log(
      `Waiting for ${dbName} (${dbType}) to spool up. This may take a while, but will timeout if not completed within 20 minutes...`,
    );
    const waitStart = Date.now();
    await waitUntilDBInstanceAvailable(
      {
        client: rdsClient,
        maxWaitTime: 1200, // 20 minutes timeout
        minDelay: 10, // Check every 10 seconds
        maxDelay: 20, // Maximum 20 seconds between checks
      },
      { DBInstanceIdentifier: dbName },
    );
    const waitTime = Date.now() - waitStart;
    console.log(
      `${dbType} is spooled up after ${Math.floor(waitTime / 60000)} minutes ${Math.floor((waitTime % 60000) / 1000)} seconds!`,
    );
  } catch (error) {
    if (error.name === "TimeoutError" || error.message.includes("timeout")) {
      console.warn(`Warning: spooling up ${dbName} (${dbType}) timed out after 20 minutes.`);
    } else {
      console.warn(`Warning: spooling up ${dbName} (${dbType}) failed with error:`, error);
    }
  }

  // Try to connect to RDS database endpoint
  let dbEndpoint;
  let retryCount = 0;
  const maxRetries = 3;

  console.log(`${dbName} (${dbType}): Attempting to get database endpoint from RDS...`);
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
          `${dbName} (${dbType}): Successfully retrieved database endpoint: ${dbEndpoint.DBInstances[0].Endpoint.Address}`,
        );
        break;
      } else {
        throw new Error("Database endpoint not yet available.");
      }
    } catch (error) {
      retryCount++;
      console.warn(`${dbName} (${dbType}): Attempt ${retryCount} failed to get endpoint:`, error);

      if (retryCount >= maxRetries) {
        console.error(
          `${dbName} (${dbType}): Failed to get database endpoint after ${maxRetries} attempts`,
        );
        throw error;
      }

      console.log(`${dbName} (${dbType}): Waiting 30 seconds before retry...`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  // Update list of AWS resources
  console.log("Updated awsResources with db information");
  try {
    const awsResources = readAwsResources();
    if (awsResources && awsResources.dbs) {
      awsResources.dbs.push(dbName);
    } else {
      awsResources.dbs = [dbName];
    }
    writeAwsResources(awsResources);
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

  console.log(`${dbType}: Returning created database object:`, newDB);
  return newDB;
};

/**
 * (Helper)
 * Get existing database configuration from pushkin.yaml
 */
const getExistingDBConfig = async (dbName, dbType, verbose = false) => {
  console.log(`${dbName} (${dbType}): Database already exists, returning existing config`);
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }
  if (verbose) {
    console.log(
      `${dbName} (${dbType}): Returning existing database config:`,
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
 * (Helper)
 * Get list of databases to delete
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
 * Delete the specified databases.
 * @param {Promise<Array<string>>} dbs - Promise that resolves to list of database identifiers
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<boolean>} - Promise that resolves when databases are deleted
 */
const deleteDBs = async (dbs, useIAM) => {
  dbs = await dbs;

  if (dbs.length == 0) {
    console.log(`No databases to delete.`);
    return true;
  }
  console.log(`Removing deletion protection from databases ${dbs}...`);
  const rdsClient = createRDSClient(useIAM);

  await Promise.all(
    dbs.map(async (db) => {
      try {
        await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: db }));
      } catch (error) {
        console.warn(`Unable to find database ${db}. Possibly it was already deleted.`, error);
        // Remove from list
        dbs = dbs.filter((d) => d !== db);
        return;
      }

      await rdsClient.send(
        new ModifyDBInstanceCommand({
          DBInstanceIdentifier: db,
          DeletionProtection: false,
          ApplyImmediately: true,
        }),
      );
    }),
  );

  console.log(`Deleting databases ${dbs}...`);

  const checkDBDeletable = async (dbId) => {
    console.log(`Checking database ${dbId} for deletion protection`);
    try {
      const response = await rdsClient.send(
        new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbId }),
      );
      return response.DBInstances?.[0]?.DeletionProtection === false;
    } catch (error) {
      console.error(
        `Unable to get information for db ${dbId}. Possibly it was already deleted. Skipping.`,
        error,
      );
      return false;
    }
  };

  // Wait for deletion protection to be disabled, then delete databases
  const waitAndDeleteDBs = async () => {
    const checkResults = await Promise.all(dbs.map((db) => checkDBDeletable(db)));

    if (checkResults.includes(false)) {
      console.log("Waiting for DBs to be deletable...");
      await new Promise((resolve) => setTimeout(resolve, 20000));
      return waitAndDeleteDBs(); // Recursively check again
    }

    // All databases are deletable, proceed with deletion
    await Promise.all(
      dbs.map(async (db) => {
        try {
          // Check current database status
          const response = await rdsClient.send(
            new DescribeDBInstancesCommand({ DBInstanceIdentifier: db }),
          );
          const dbStatus = response.DBInstances?.[0]?.DBInstanceStatus;

          if (dbStatus !== "deleting") {
            console.log(`Deleting database ${db}`);
            await rdsClient.send(
              new DeleteDBInstanceCommand({
                DBInstanceIdentifier: db,
                SkipFinalSnapshot: true,
              }),
            );
          }
        } catch (error) {
          if (error.message.includes("already being deleted")) {
            console.warn(`Database ${db} already being deleted.`);
          } else {
            console.error(`Unable to get information about ${db}:`, error);
            throw error;
          }
        }
      }),
    );
  };

  await waitAndDeleteDBs();

  // Wait for databases to be fully deleted
  const waitForDeletion = async () => {
    // Check if our target databases still exist
    const stillExisting = [];
    for (const dbId of dbs) {
      try {
        await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbId }));
        stillExisting.push(dbId);
      } catch {
        // Database not found - it's been deleted
        console.log(`Database ${dbId} confirmed deleted`);
      }
    }

    if (stillExisting.length === 0) {
      console.log(`All target databases confirmed deleted`);
      return true;
    } else {
      console.log(
        `Waiting for ${stillExisting.length} database(s) to be deleted: ${stillExisting.join(", ")}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 20000));
      return waitForDeletion(); // Recursively check again
    }
  };

  return waitForDeletion();
};

/**
 * Retrieve database connection information from pushkin.yaml
 * @returns {Promise<object>} - The database connection details
 */
const getDBInfo = async () => {
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }
  if (pushkinConfig.productionDBs && Object.keys(pushkinConfig.productionDBs).length >= 2) {
    let dbsByType = {};
    Object.keys(pushkinConfig.productionDBs).forEach((d) => {
      dbsByType[pushkinConfig.productionDBs[d].type] = {
        name: pushkinConfig.productionDBs[d].name,
        username: pushkinConfig.productionDBs[d].user,
        password: pushkinConfig.productionDBs[d].pass,
        port: pushkinConfig.productionDBs[d].port,
        endpoint: pushkinConfig.productionDBs[d].host,
      };
    });
    return dbsByType;
  } else {
    throw new Error(
      `Error finding production DBs in pushkin.yaml. This suggests database creation did not complete properly.`,
    );
  }
};

/**
 * Record databases in pushkin.yaml
 * WHY: When we create databases, we get the connection information back in this function. This information needs to be recorded in pushkin.yaml so that the application can connect to the databases. We wait to record the databases until they are created and we have all the necessary information (like host and port) to avoid having incomplete database entries in pushkin.yaml if something goes wrong during creation.
 * @param {*} dbDone - A promise that resolves when the databases are set up
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
    const returnedPromises = await Promise.race([dbDone, timeout]);
    console.log("recordDBs: Database promises resolved, processing results...");
    console.log("recordDBs: mainDB result:", returnedPromises[0]);
    console.log("recordDBs: transactionDB result:", returnedPromises[1]);

    // Check if either database result is undefined
    if (!returnedPromises[0] || !returnedPromises[1]) {
      throw new Error(
        "One or both databases returned undefined - database creation may have failed",
      );
    }

    const mainDB = returnedPromises[0]; //this is why it has to be first
    const transactionDB = returnedPromises[1]; //this is why it has to be second

    console.log(`Databases created. Adding to local config definitions.`);
    let pushkinConfig;
    try {
      pushkinConfig = await loadPushkinConfig();
    } catch (error) {
      console.error(`Failed to load pushkin.yaml:`, error);
      throw error;
    }

    // Would have made sense for local databases and production databases to be nested within 'databases'
    // But poor planning prevents that. And we'd like to avoid breaking changes, so...
    if (pushkinConfig.productionDBs == null) {
      pushkinConfig.productionDBs = {};
    }
    if (transactionDB) {
      // false means it is preexisting, doesn't need to be updated
      pushkinConfig.productionDBs[transactionDB.type] = transactionDB;
    }
    if (mainDB) {
      // false means it is preexisting, doesn't need to be updated
      pushkinConfig.productionDBs[mainDB.type] = mainDB;
    }
    try {
      await savePushkinConfig(pushkinConfig);
      console.log(`Successfully updated pushkin.yaml with databases.`);
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

// Export all functions
export { initDB, getDBInfo, recordDBs, getDBsToDelete, deleteDBs };
