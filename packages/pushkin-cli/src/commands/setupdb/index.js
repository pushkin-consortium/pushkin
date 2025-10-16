import path from "path";
import fs from "graceful-fs";
import jsYaml from "js-yaml";
import knex from "knex";
import * as compose from "docker-compose";
import util from "util";
import crypto from "crypto";
import { exec as execCallback } from "child_process";

const exec = util.promisify(execCallback);

/**
 * Overwrite testDB and transactionDB passwords with secure randomly generated ones
 * @returns {void}
 */
export const securePasswords = () => {
  // Load pushkin.yaml and docker-compose.dev.yml
  const config = jsYaml.load(fs.readFileSync("pushkin.yaml", "utf8"));
  const composeFile = jsYaml.load(fs.readFileSync("pushkin/docker-compose.dev.yml", "utf8"));
  // Securely generate new passwords
  const testDBPass = crypto.randomBytes(16).toString("hex");
  const transactionsPass = crypto.randomBytes(16).toString("hex");
  // Update passwords
  config.databases.localtestdb.pass = testDBPass;
  composeFile.services.test_db.environment.POSTGRES_PASSWORD = testDBPass;
  config.databases.localtransactiondb.pass = transactionsPass;
  composeFile.services.test_transaction_db.environment.POSTGRES_PASSWORD = transactionsPass;
  // Write new pushkin.yaml and docker-compose.dev.yml
  fs.writeFileSync("pushkin.yaml", jsYaml.dump(config));
  fs.writeFileSync("pushkin/docker-compose.dev.yml", jsYaml.dump(composeFile));
};

const ensureProductionDBField = function (configPath, verbose) {
  // Load the config file
  let config;
  try {
    const configFileContents = fs.readFileSync(configPath, "utf8");
    config = jsYaml.load(configFileContents);
  } catch (e) {
    console.error(`Failed to read config file at ${configPath}`);
    throw e;
  }
  // Add productionDB field if it doesn't exist (backwards compatibility)
  if (!config.productionDB) {
    config.productionDB = "Main";
    try {
      fs.writeFileSync(configPath, jsYaml.dump(config), "utf8");
      if (verbose) console.log(`Updated "productionDB" in ${configPath}`);
    } catch (e) {
      if (verbose) console.error("Failed to update productionDB: ", e);
      throw e;
    }
  }
};

/**
 * Collects all database migration and seed files from the users directory and experiments directory,
 * organizing them by which database they belong to. Multiple experiments may share the same
 * database, so all their migrations need to be run together.
 * @param {string} usersDir - Absolute path to the users directory
 * @param {string} experimentsDir - Absolute path to the experiments directory
 * @param {boolean} production - Use productionDB for AWS deployment; otherwise use database
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise<Map<string, Array<{migrations: string, seeds: string}>>>}
 *   Map of database names to arrays of migration/seed directory paths
 * @throws {Error} If config files cannot be read or parsed
 */
export async function getMigrations(usersDir, experimentsDir, production, verbose) {
  // Map structure: database name -> array of { migrations: path, seeds: path }
  const dbsToExps = new Map();

  // === 1. Load migrations from the users directory ===
  const usersConfigPath = path.join(usersDir, "config.yaml");
  ensureProductionDBField(usersConfigPath, verbose);

  let usersConfig;
  try {
    usersConfig = jsYaml.load(fs.readFileSync(usersConfigPath, "utf8"));
  } catch (e) {
    throw new Error(
      `Failed to load users config at ${usersConfigPath}. ` +
      `Make sure the file exists and contains valid YAML.\nOriginal error: ${e.message}`,
    );
  }

  const usersMigsDir = path.join(usersDir, usersConfig.migrations.location);
  const usersDatabase = production ? usersConfig.productionDB : usersConfig.database;
  if (verbose) console.log(`usersMigsDir: ${usersMigsDir}`);
  if (verbose) console.log(`usersDatabase: ${usersDatabase}`);

  // Add users migrations to the map (users don't have seeds)
  if (dbsToExps.has(usersDatabase)) {
    dbsToExps.get(usersDatabase).push({ migrations: usersMigsDir, seeds: "" });
  } else {
    dbsToExps.set(usersDatabase, [{ migrations: usersMigsDir, seeds: "" }]);
  }

  // === 2. Load migrations from each experiment in experiments directory ===
  let expConfig;
  // Note: forEach is synchronous, so no race conditions here
  fs.readdirSync(experimentsDir).forEach((expDir) => {
    if (verbose) console.log(`Loading migrations for ${expDir}`);
    const expDirPath = path.join(experimentsDir, expDir);

    // Skip non-directories
    if (!fs.lstatSync(expDirPath).isDirectory()) return;

    // Load experiment config
    const expConfigPath = path.join(expDirPath, "config.yaml");
    ensureProductionDBField(expConfigPath, verbose);

    try {
      expConfig = jsYaml.load(fs.readFileSync(expConfigPath, "utf8"));
    } catch (e) {
      // Log error and skip this experiment if config missing or invalid
      console.error(
        `Failed to load experiment config at ${expConfigPath}. ` +
        `Skipping experiment "${expDir}". ` +
        `Make sure config.yaml exists and contains valid YAML.\nError: ${e.message}`,
      );
      return;
    }
    if (verbose) console.log(`expConfig:\n ${JSON.stringify(expConfig)}`);

    // Determine which database this experiment uses and where its migrations/seeds are
    const expDatabase = production ? expConfig.productionDB : expConfig.database;
    const migsDir = path.join(expDirPath, expConfig.migrations.location);
    const seedsDir = path.join(expDirPath, expConfig.seeds.location);

    // Add to the map (multiple experiments can share the same database)
    if (dbsToExps.has(expDatabase)) {
      dbsToExps.get(expDatabase).push({ migrations: migsDir, seeds: seedsDir });
    } else {
      dbsToExps.set(expDatabase, [{ migrations: migsDir, seeds: seedsDir }]);
    }
  });

  return dbsToExps;
}

/**
 * Wait for database to be ready by attempting to connect with retries.
 * Uses exponential backoff to avoid overwhelming the database during startup.
 * @param {object} knexInstance - Knex instance to test
 * @param {string} dbName - Database name for logging
 * @param {number} maxRetries - Maximum number of retry attempts (default 10)
 * @returns {Promise<void>}
 * @throws {Error} If database doesn't become ready after maxRetries attempts
 */
const waitForDBReady = async (knexInstance, dbName, maxRetries = 10) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await knexInstance.raw("SELECT 1");
      console.log(`Database ${dbName} is ready for connections`);
      return;
    } catch (error) {
      const waitTime = Math.min(1000 * Math.pow(2, i), 30000);
      console.log(
        `Database ${dbName} not ready yet (attempt ${i + 1}/${maxRetries}), waiting ${waitTime}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Throw on last attempt
      if (i === maxRetries - 1) {
        throw new Error(
          `Database ${dbName} did not become ready after ${maxRetries} attempts: ${error.message}`,
        );
      }
    }
  }
};

/**
 * Wait for a Docker database container to be healthy.
 * Only used for local development with Docker Compose.
 * 'test_db' is the main database for experiments/users.
 * 'test_transaction_db' is the audit log database for query tracking/debugging.
 * @param {string} dockerDB - Docker database container name (e.g., 'test_db', 'test_transaction_db')
 * @param {boolean} verbose - Whether to enable verbose logging
 * @param {number} maxRetries - Maximum number of retry attempts (default 60)
 * @param {number} checkInterval - Interval between health checks in milliseconds (default 2500)
 * @returns {Promise<void>} Resolves when container is healthy
 * @throws {Error} If container doesn't become healthy after maxRetries attempts
 */
async function waitForDockerDBContainerReady(
  dockerDB,
  verbose,
  maxRetries = 60,
  checkInterval = 2500,
) {
  for (let i = 0; i < maxRetries; i++) {
    if (verbose && i === 0) console.log(`Waiting for ${dockerDB}...`);

    const containerStatus = await exec(
      `docker ps --format "{{.Names}} {{.Status}}" | awk '/pushkin[-_]${dockerDB}[-_]1/ {print $0}'`,
    );

    if (containerStatus.stdout.search("healthy") > 0) {
      if (verbose) console.log(`${dockerDB} is healthy`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval));

    if (i === maxRetries - 1) {
      throw new Error(`${dockerDB} did not become healthy after ${maxRetries} attempts`);
    }
  }
}

/**
 * Build Knex configuration object for database connection.
 * @param {object} dbInfo - Database connection info (url, user, port, pass, name)
 * @returns {object} Knex configuration object
 */
function buildKnexConfig(dbInfo) {
  return {
    client: "pg",
    version: "11",
    connection: {
      host: dbInfo.url,
      user: dbInfo.user,
      port: dbInfo.port,
      password: dbInfo.pass,
      database: dbInfo.name,
      // Enable SSL for AWS RDS or non-localhost connections
      ssl:
        (
          dbInfo.url.includes(".rds.amazonaws.com") ||
          (dbInfo.url !== "localhost" && !dbInfo.url.includes("localhost"))
        ) ?
          { rejectUnauthorized: false }
          : false,
    },
    // Connection pool settings optimized for migration stability
    pool: {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 60000,
      createTimeoutMillis: 60000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    acquireConnectionTimeout: 60000,
  };
}

/**
 * Run database migrations and seeds for all configured databases.
 * Connects to each database using Knex, runs migrations to create/update table schemas,
 * then runs seeds to populate initial data.
 * @param {Map<string, Array<{migrations: string, seeds: string}>>} dbsToExps - Map of database names to migration/seed paths
 * @param {object} dbConfigs - Database configurations from pushkin.yaml
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise<Array>} Promise that resolves when all migrations complete
 * @throws {Error} If any migration or seed operation fails
 */
export async function runMigrations(dbsToExps, dbConfigs, verbose) {
  let migrationPromises = [];
  dbsToExps.forEach((migAndSeedDirs, db) => {
    // Validate database is configured
    if (!dbConfigs[db]) {
      console.error(`The database ${db} is not configured in pushkin.yaml`);
      return;
    }

    let dbInfo = dbConfigs[db];
    // Default to localhost if no url specified
    if (!dbInfo.url) {
      if (verbose)
        console.log(`No url listed for database ${dbInfo.name}. Defaulting to 'localhost'.`);
      dbInfo.url = "localhost";
    }

    // Extract migration directories and filter out empty seed directories
    const migDirs = migAndSeedDirs.map((dir) => dir.migrations);
    const seedDirs = migAndSeedDirs.map((dir) => dir.seeds).filter((value) => value != "");

    // Create Knex instance with database connection config
    const knexClient = knex(buildKnexConfig(dbInfo));

    // Create a promise for this database's migration
    migrationPromises.push(
      (async () => {
        if (verbose) console.log(`Running migrations for ${db}`);

        try {
          // Wait for database to be ready (especially important for RDS)
          await waitForDBReady(knexClient, db);

          // Run migrations
          await knexClient.migrate.latest({ directory: migDirs });
          if (verbose) console.log(`Ran migrations for ${db}`);

          // Run all seeds for this database
          const seedPromises = seedDirs.map((seedDir) => {
            if (verbose) console.log(`Running seeds on ${seedDir}`);
            return knexClient.seed.run({ directory: seedDir });
          });
          await Promise.all(seedPromises);

          return true;
        } catch (e) {
          console.error(`Database ${db} migration failed:`, e.message);
          throw e;
        } finally {
          // Clean up Knex connection
          knexClient.destroy();
        }
      })(), // IIFE
    );
  });

  // Wait for all database migrations to complete
  return Promise.all(migrationPromises);
}

/**
 * Set up the local transactions database configuration if it doesn't exist.
 *
 * The local transactions database (test_transaction_db) is an audit log that records all database
 * queries executed during local development. It helps with debugging by providing a history
 * of all operations. This is separate from the test_db which stores experiment data.
 *
 * This function creates the necessary Docker Compose service and Pushkin config entries.
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise<boolean>} Returns true when setup is complete
 * @throws {Error} If config files cannot be read or written
 */
export async function setupLocalTransactionsDB(verbose) {
  // Load configuration files
  let composeFile, pushkinConfig;
  try {
    const composeFileContents = await fs.promises.readFile(
      path.join(process.cwd(), "pushkin/docker-compose.dev.yml"),
      "utf8",
    );
    composeFile = jsYaml.load(composeFileContents);
  } catch (e) {
    throw new Error(
      `Failed to load pushkin/docker-compose.dev.yml. Make sure it exists.\nOriginal error: ${e.message}`,
    );
  }

  try {
    const pushkinConfigContents = await fs.promises.readFile(
      path.join(process.cwd(), "pushkin.yaml"),
      "utf8",
    );
    pushkinConfig = jsYaml.load(pushkinConfigContents);
  } catch (e) {
    throw new Error(
      `Failed to load pushkin.yaml. Make sure it exists.\nOriginal error: ${e.message}`,
    );
  }

  // Create transactions DB service if it doesn't exist
  if (!composeFile.services.test_transaction_db) {
    if (verbose)
      console.log(`No transaction db for logging found in docker-compose.dev.yml. Creating.`);

    // Add Docker Compose service for transactions database
    composeFile.services.test_transaction_db = {
      image: "postgres:11",
      environment: {
        POSTGRES_PASSWORD: "example",
        POSTGRES_DB: "test_transaction_db",
      },
      ports: ["5433:5432"],
      volumes: ["test_transaction_db_volume:/var/lib/postgresql/data"],
      healthcheck: {
        test: ["CMD-SHELL", "pg_isready -U postgres"],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
    };
    composeFile.volumes.test_transaction_db_volume = null;

    // Write updated docker-compose file
    if (verbose) console.log(`Updating pushkin/docker-compose.dev.yml to include transaction db`);
    await fs.promises.writeFile(
      path.join(process.cwd(), "pushkin/docker-compose.dev.yml"),
      jsYaml.dump(composeFile),
    );

    // Add database config to pushkin.yaml
    pushkinConfig.databases.localtransactiondb = {
      user: "postgres",
      pass: "example",
      host: "test_transaction_db",
      port: "5433",
      url: "localhost",
      name: "test_transaction_db",
    };

    // Write updated pushkin.yaml
    if (verbose) console.log(`Updating pushkin.yaml`);
    await fs.promises.writeFile(
      path.join(process.cwd(), "pushkin.yaml"),
      jsYaml.dump(pushkinConfig),
    );
  }
  if (verbose) {
    console.log("Finished updating configs for test transactions db");
    console.log(`Checking if a migrations file for transactions exists`);
  }

  // Create coreMigrations directory if it doesn't exist
  const migDir = path.join(process.cwd(), "coreMigrations");
  await fs.promises.mkdir(migDir, { recursive: true });

  // Create migration file for transactions table if it doesn't exist
  try {
    await fs.promises.readFile(path.join(migDir, "migrateTransactions.js"));
    if (verbose) console.log(`Migrations for transactions db already exist. Skipping creation.`);
  } catch (e) {
    if (verbose) console.log(`Migrations file for transactions table doesn't exist yet. Creating.`);
    await fs.promises.writeFile(
      path.join(migDir, "migrateTransactions.js"),
      `exports.up = function(knex) {
        return knex.schema.createTable('transactions', function (table) {
          table.increments();
          table.string('query', 800).notNullable();
          table.string('bindings');
          table.timestamps();
        });
      };

      exports.down = function(knex) {
        return knex.schema.dropTable('transactions');
      };`,
    );
  }
  return true;
}

/**
 * Run migrations for the transactions database (audit log).
 * The transactions database records all queries for debugging purposes.
 * Waits for the Docker container to be healthy before running migrations.
 * @param {object} coreDBs - Database configurations from pushkin.yaml
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise} Promise that resolves when migrations complete
 */
export async function migrateTransactionsDB(coreDBs, verbose) {
  // Wait for container to be healthy
  await waitForDockerDBContainerReady("test_transaction_db", verbose);

  // Set up migrations map
  if (verbose) console.log(`Starting migrations for test transactions DB.`);
  const transMigrations = new Map();
  transMigrations.set("localtransactiondb", [
    { migrations: path.join(process.cwd(), "coreMigrations"), seeds: "" },
  ]);

  // Run migrations
  return runMigrations(transMigrations, coreDBs, verbose);
}

/**
 * Wait for main test database to be healthy, then run migrations.
 * The main test database (test_db) stores experiment data and user accounts.
 * @param {Map} dbMigrationsMap - Map of database names to migration/seed paths
 * @param {object} coreDBs - Database configurations from pushkin.yaml
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise} Promise that resolves when migrations complete
 */
async function migrateExperimentsDB(dbMigrationsMap, coreDBs, verbose) {
  await waitForDockerDBContainerReady("test_db", verbose);
  return runMigrations(dbMigrationsMap, coreDBs, verbose);
}

/**
 * Set up all databases by running migrations and seeds.
 * This is the main orchestration function that:
 * 1. Starts Docker containers for test databases:
 *    - test_db: Main database for experiments and user accounts
 *    - test_transaction_db: Audit log database for query tracking/debugging
 * 2. Collects all migrations from experiments and users
 * 3. Waits for database containers to be healthy
 * 4. Runs migrations and seeds in parallel
 * 5. Stops all database containers when done
 * @param {object} coreDBs - Database configurations object from pushkin.yaml
 * @param {string} usersDir - Path to users directory
 * @param {string} mainExpDir - Path to main experiments directory
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise} Promise that resolves when setup is complete
 */
export async function setupdb(coreDBs, usersDir, mainExpDir, verbose) {
  // === 1. Start Docker containers for test databases ===
  // test_db: Main database for experiments/users
  // test_transaction_db: Audit log (records all queries for debugging)
  // Note: Knex requires all migrations for the same DB to be run together
  if (verbose) console.log("Spooling up Docker containers for test databases.");
  const dbPromise = compose.upMany(["test_db", "test_transaction_db"], {
    cwd: path.join(process.cwd(), "pushkin"),
    config: "docker-compose.dev.yml",
  });

  // === 2. Collect all migrations from experiments and users ===
  const dbMigrationsMap = await getMigrations(usersDir, mainExpDir, false, verbose);

  // === 3. Wait for database containers to start before proceeding ===
  await dbPromise;

  // === 4. Run migrations and seeds in parallel ===
  const setupTransactionsTable = migrateTransactionsDB(coreDBs, verbose);
  const experimentMigrationsPromise = migrateExperimentsDB(dbMigrationsMap, coreDBs, verbose);
  await Promise.all([experimentMigrationsPromise, setupTransactionsTable]);

  if (verbose) console.log("Finished running all migrations. Shutting down database containers.");

  // === 5. Stop all database containers ===
  return await compose.stop({
    cwd: path.join(process.cwd(), "pushkin"),
    config: "docker-compose.dev.yml",
  });
}
