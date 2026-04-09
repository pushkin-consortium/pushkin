import crypto from "crypto";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  CreateDBInstanceCommand,
  ModifyDBInstanceCommand,
  DeleteDBInstanceCommand,
  waitUntilDBInstanceAvailable,
} from "@aws-sdk/client-rds";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { readAwsResources, writeAwsResources } from "../utils/aws-resources.js";
import { AWS_REGION } from "../constants.js";
import { dbConfig } from "../awsConfigs.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * (Helper)
 * Creates an RDS client with consistent configuration
 * WHY: Ensure all RDS operations use the same region and IAM profile.
 */
const createRDSClient = (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  return factory.createClient(RDSClient);
};

/**
 * Create the Access Control List if it doesn't already exist -> create Main and Transaction databases
 * @param {string} dbType - The type of database (e.g., 'postgres', 'mysql')
 * @param {string} securityGroupID - The security group ID for the database
 * @param {string} projName - The project name
 * @param {string} awsName - The AWS resource name
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<object>} - The database connection details
 */
const initDB = async (dbType, securityGroupID, projName, awsName, useIAM) => {
  console.log(`Handling ${dbType} database.`);
  let dbName, dbPassword;
  dbName = projName.concat(dbType).replace(/[^A-Za-z0-9]/g, "");

  /**
   * Determine if a new database is needed
   * @param {string} dbName - The name of the database
   * @param {string} dbType - The type of database (e.g., 'postgres', 'mysql')
   * @param {string} useIAM - The IAM profile to use
   * @returns {Promise<boolean>} - Whether a new database is needed
   */
  const doINeedDB = async (dbName, dbType, useIAM) => {
    //First, check pushkin.yaml -- do we have a database already?
    let temp;
    let pushkinConfig;
    try {
      temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
      pushkinConfig = jsYaml.load(temp);
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`);
      throw e;
    }
    if (
      pushkinConfig.productionDBs &&
      Object.keys(pushkinConfig.productionDBs).includes(dbType) &&
      pushkinConfig.productionDBs[dbType].name == dbName
    ) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `${dbName} is in pushkin.yaml. If that surprises you, look into it.\n Checking whether it is also on RDS.`,
      );
      //check whether it's fully configured in RDS
      //First, check to see if database exists
      let dbInstances;
      try {
        const rdsClient = createRDSClient(useIAM);
        const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
        dbInstances = response.DBInstances;
      } catch (e) {
        console.error(`Unable to get list of RDS databases`);
        throw e;
      }
      let foundDB = false;
      let retrievedDBInfo;
      dbInstances.forEach((db) => {
        if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
          foundDB = true;
          retrievedDBInfo = db;
        }
      });
      if (foundDB) {
        //Does its parameters match what we expect?
        let sameParams = true;
        if (
          pushkinConfig.productionDBs[dbType].name.toLowerCase() !=
          retrievedDBInfo.DBName.toLowerCase()
        ) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database name on RDS does not match pushkin.yaml`);
        }
        if (pushkinConfig.productionDBs[dbType].user != retrievedDBInfo.MasterUsername) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database user on RDS does not match pushkin.yaml`);
        }
        //if (pushkinConfig.productionDBs[dbType].pass != FUBAR) {sameParams = false} //No way to check the password; assume if rest is correct, that's still correct
        if (pushkinConfig.productionDBs[dbType].port != retrievedDBInfo.Endpoint.Port) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database port on RDS does not match pushkin.yaml`);
        }
        if (pushkinConfig.productionDBs[dbType].host != retrievedDBInfo.Endpoint.Address) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database host on RDS does not match pushkin.yaml`);
        }
        if (sameParams) {
          console.log(
            `${dbName} is already configured on RDS. Skipping.\n Note that if the password stored in the YAML is wrong, the CLI can't check that.`,
          );
          return false; //let's us skip creation later on
        } else {
          console.error(`${dbName} is already configured on RDS, but with different parameters.`);
          console.error(`Pushkin.yaml has:`, pushkinConfig.productionDBs[dbType]);
          console.error(`RDS has:`, retrievedDBInfo);
          process.exit();
        }
      } else {
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Database listed in pushkin.yaml, but not found on RDS. Creating.`,
        );
        return true;
      }
    } else {
      let dbInstances;
      try {
        const rdsClient = createRDSClient(useIAM);
        const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
        dbInstances = response.DBInstances;
      } catch (e) {
        console.error(`Unable to get list of RDS databases`);
        throw e;
      }
      let foundDB = false;

      dbInstances.forEach((db) => {
        if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
          foundDB = true;
        }
      });
      if (foundDB) {
        //We can't easily work around this, because we don't have the password saved anywhere!
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Database ${dbName} found on RDS, but not listed in pushkin.yaml. This is a problem.\n
          You will need to delete the database from RDS before continuing.`,
        );
        process.exit();
      } else {
        return true;
      }
    }
  };

  let needDB = await doINeedDB(dbName, dbType, useIAM);
  if (needDB) {
    /**
     * Function to generate a secure random password
     * @returns {string} - A secure random password
     */
    const generateSecurePassword = () => {
      const length = 12;
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%^&*()-_=+";
      let password = "";

      for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
      }

      return password;
    };

    dbPassword = generateSecurePassword(); //Pick random password for database
    let myDBConfig = JSON.parse(JSON.stringify(dbConfig));
    myDBConfig.DBName = dbName;
    myDBConfig.DBInstanceIdentifier = dbName.toLowerCase();
    myDBConfig.VpcSecurityGroupIds = [securityGroupID];
    myDBConfig.MasterUserPassword = dbPassword;
    myDBConfig.Tags = [{ Key: PROJECT_TAG_KEY, Value: projName }];

    try {
      const rdsClient = createRDSClient(useIAM);
      await rdsClient.send(new CreateDBInstanceCommand(myDBConfig));
    } catch (e) {
      console.error(`Unable to create database ${dbType}`);
      throw e;
    }

    console.log(`Database ${dbType} created with following:`, myDBConfig);
    console.log(`Database ${dbType} created.`);

    try {
      // Wait for database to be available with timeout
      console.log(`Waiting for ${dbType} to spool up. This may take a while...`);
      console.log(`${dbType}: Starting waitUntilDBInstanceAvailable with 20 mins timeout...`);
      const rdsClient = createRDSClient(useIAM);

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
      const waitTime = Math.round((Date.now() - waitStart) / 1000);
      console.log(`${dbType} is spooled up after ${waitTime} seconds!`);
    } catch (e) {
      if (e.name === "TimeoutError" || e.message.includes("timeout")) {
        console.warn(
          `Warning: ${dbType} timed out after 20 minutes. Attempting to get database endpoint anyway...`,
        );
      } else {
        console.warn(
          `Warning: ${dbType} waitUntilDBInstanceAvailable failed with error. Attempting to get database endpoint anyway...`,
        );
        console.warn(`Wait error details:`, e.name, "-", e.message);
      }
      // Don't throw here - continue and try to get the database endpoint
    }

    let dbEndpoint;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `${dbType}: Attempting to get database endpoint (attempt ${retryCount + 1}/${maxRetries})...`,
        );
        const rdsClient = createRDSClient(useIAM);
        dbEndpoint = await rdsClient.send(
          new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbName }),
        );

        // Check if we got a valid endpoint
        if (dbEndpoint?.DBInstances?.[0]?.Endpoint?.Address) {
          console.log(
            `${dbType}: Successfully retrieved database endpoint: ${dbEndpoint.DBInstances[0].Endpoint.Address}`,
          );
          break;
        } else {
          throw new Error("Database endpoint not yet available");
        }
      } catch (e) {
        retryCount++;
        console.warn(`${dbType}: Attempt ${retryCount} failed to get endpoint:`, e.message);

        if (retryCount >= maxRetries) {
          console.error(`${dbType}: Failed to get database endpoint after ${maxRetries} attempts`);
          throw e;
        }

        // Wait 30 seconds before retrying
        console.log(`${dbType}: Waiting 30 seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 30000));
      }
    }

    //Updating list of AWS resources
    console.log("Updated awsResources with db information");
    try {
      const awsResources = readAwsResources();
      if (awsResources && awsResources.dbs) {
        awsResources.dbs.push(dbName);
      } else {
        awsResources.dbs = [dbName];
      }
      writeAwsResources(awsResources);
    } catch (e) {
      console.error(`Unable to update awsResources.js`);
      console.error(e);
    }

    const newDB = {
      type: dbType,
      name: dbName,
      host: dbEndpoint.DBInstances[0].Endpoint.Address,
      url: dbEndpoint.DBInstances[0].Endpoint.Address, //this is same as 'host' for AWS, but different for local deploy in Docker
      user: myDBConfig.MasterUsername,
      pass: myDBConfig.MasterUserPassword,
      port: myDBConfig.Port,
    };

    console.log(`${dbType}: initDB function returning database object:`, newDB);
    return newDB;
  } else {
    //Already set up. Just return the info.
    console.log(`${dbType}: Database already exists, returning existing config`);
    let temp;
    let pushkinConfig;
    try {
      temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
      pushkinConfig = jsYaml.load(temp);
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`);
      throw e;
    }
    console.log(
      `${dbType}: Returning existing database config:`,
      pushkinConfig.productionDBs[dbType],
    );
    return pushkinConfig.productionDBs[dbType];
  }
};

/**
 * Get list of databases to delete
 * @param {string} useIAM - The IAM profile to use
 * @param {string} killTag - The tag to filter databases by
 * @param {object} awsResources - The AWS resources object
 * @returns {Promise<Array<string>>} - List of database identifiers to delete
 */
const dbsToDeleteFunc = async (useIAM, killTag, awsResources) => {
  // Get list of DBs to delete
  const dbs = [];
  let dbInstances;
  try {
    const rdsClient = createRDSClient(useIAM);
    const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
    dbInstances = response.DBInstances || [];
  } catch (e) {
    console.error(`Unable to list databases`);
    throw e;
  }

  dbInstances.forEach((db) => {
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
 * Delete the specified databases
 * @param {Promise<Array<string>>} dbs - Promise that resolves to list of database identifiers
 * @param {string} useIAM - The IAM profile to use
 * @param {string} killTag - The tag to filter databases by
 * @returns {Promise<boolean>} - Promise that resolves when databases are deleted
 */
const deleteDatabases = async (dbs, useIAM, killTag) => {
  dbs = await dbs;

  if (dbs.length == 0) {
    console.log(`No databases to delete.`);
    return true;
  }
  console.log(`Removing deletion protection from databases ${dbs}.`);
  const rdsClient = createRDSClient(useIAM);

  await Promise.all(
    dbs.map(async (db) => {
      try {
        // Check if database exists
        await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: db }));
      } catch (e) {
        console.warn(`Unable to find database ${db}. Possibly it was already deleted.`);
        // Remove from list
        dbs = dbs.filter((d) => d !== db);
        return;
      }

      // Disable deletion protection
      await rdsClient.send(
        new ModifyDBInstanceCommand({
          DBInstanceIdentifier: db,
          DeletionProtection: false,
          ApplyImmediately: true,
        }),
      );
    }),
  );

  console.log(`Deleting databases`);

  const checkDatabaseDeletable = async (dbId) => {
    console.log(`Checking database ${dbId} for deletion protection`);
    try {
      const response = await rdsClient.send(
        new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbId }),
      );
      return response.DBInstances?.[0]?.DeletionProtection === false;
    } catch (e) {
      console.error(
        `Unable to get information for db ${dbId}. Possibly it was already deleted. Skipping`,
      );
      return false;
    }
  };

  // Wait for deletion protection to be disabled, then delete databases
  const waitAndDelete = async () => {
    // Check all databases are deletable (deletion protection removed)
    const checkResults = await Promise.all(dbs.map((db) => checkDatabaseDeletable(db)));

    if (checkResults.includes(false)) {
      console.log("Waiting for DBs to be deletable...");
      await new Promise((resolve) => setTimeout(resolve, 20000));
      return waitAndDelete(); // Recursively check again
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
        } catch (e) {
          if (e.message.includes("already being deleted")) {
            console.warn(`Database ${db} already being deleted.`);
          } else {
            console.error(`Unable to get information about ${db}: ${e.message}`);
            throw e;
          }
        }
      }),
    );
  };

  await waitAndDelete();

  // Wait for databases to be fully deleted
  const waitForDeletion = async () => {
    try {
      const response = await rdsClient.send(new DescribeDBInstancesCommand({}));
      const remainingDBs = response.DBInstances || [];

      if (remainingDBs.length === 0) {
        console.log(`Databases confirmed deleted`);
        return true;
      } else {
        console.log("Waiting for DBs to be deleted...");
        await new Promise((resolve) => setTimeout(resolve, 20000));
        return waitForDeletion(); // Recursively check again
      }
    } catch (e) {
      console.error(`Unable to get list of databases: ${e.message}`);
      throw e;
    }
  };

  return waitForDeletion();
};

/**
 * Retrieve database connection information from pushkin.yaml
 * @returns {Promise<object>} - The database connection details
 */
const getDBInfo = async () => {
  let temp;
  let pushkinConfig;
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(temp);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
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
    console.error(" section missing from pushkin.yaml");
    console.error("This suggests database creation did not complete properly");
    throw new Error(`Error finding production DBs in pushkin.yaml`);
  }
};

/**
 * Record databases in pushkin.yaml
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
      const yamlContent = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
      pushkinConfig = jsYaml.load(yamlContent);
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`);
      throw e;
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
      await fs.promises.writeFile(
        path.join(process.cwd(), "pushkin.yaml"),
        jsYaml.dump(pushkinConfig),
        "utf8",
      );
      console.log(`Successfully updated pushkin.yaml with databases.`);
    } catch (e) {
      console.error(`Couldn't write updated pushkin.yaml`);
      throw e;
    }

    return pushkinConfig;
  } catch (error) {
    console.error("recordDBs: Error or timeout occurred:", error.message);
    throw error;
  }
};

// Export all functions
export { initDB, getDBInfo, recordDBs, dbsToDeleteFunc, deleteDatabases };
