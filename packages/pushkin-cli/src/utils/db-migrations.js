import path from "path";
import fs from "graceful-fs";
import jsYaml from "js-yaml";
import knex from "knex";
import { URL } from "url";

function ensureProductionDbField(configPath, verbose) {
  let config;
  try {
    const configFileContents = fs.readFileSync(configPath, "utf8");
    config = jsYaml.load(configFileContents);
  } catch (e) {
    console.error(`Failed to read config file at ${configPath}`);
    throw e;
  }
  if (!config.productionDB) {
    config.productionDB = "experiment";
    try {
      fs.writeFileSync(configPath, jsYaml.dump(config), "utf8");
      if (verbose) console.log(`Updated "productionDB" in ${configPath}`);
    } catch (e) {
      if (verbose) console.error("Failed to update productionDB: ", e);
      throw e;
    }
  }
}

async function waitForDbReady(knexInstance, dbType, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await knexInstance.raw("SELECT 1");
      console.log(`Database ${dbType} is ready for connections`);
      return;
    } catch (error) {
      const waitTime = Math.min(1000 * Math.pow(2, i), 30000);
      console.log(
        `Database ${dbType} not ready yet (attempt ${i + 1}/${maxRetries}), waiting ${waitTime}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      if (i === maxRetries - 1) {
        throw new Error(
          `Database ${dbType} did not become ready after ${maxRetries} attempts: ${error.message}`,
        );
      }
    }
  }
}

/**
 * Build Knex configuration object for database connection.
 * @param {object} dbInfo - Database connection info (url, user, port, pass, name)
 * @returns {object} Knex configuration object
 */
function buildKnexConfig(dbInfo) {
  let parsedHost;
  try {
    parsedHost = new URL(dbInfo.host).hostname;
  } catch {
    parsedHost = dbInfo.host;
  }
  return {
    client: "pg",
    version: "11",
    connection: {
      host: dbInfo.host,
      user: dbInfo.user,
      port: dbInfo.port,
      password: dbInfo.password,
      database: dbInfo.database,
      ssl:
        parsedHost && parsedHost.endsWith(".rds.amazonaws.com") ?
          { rejectUnauthorized: false }
        : false,
    },
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
async function getMigrations(usersDir, experimentsDir, production, verbose) {
  const dbsToExps = new Map();

  const usersConfigPath = path.join(usersDir, "config.yaml");
  ensureProductionDbField(usersConfigPath, verbose);

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

  if (dbsToExps.has(usersDatabase)) {
    dbsToExps.get(usersDatabase).push({ migrations: usersMigsDir, seeds: "" });
  } else {
    dbsToExps.set(usersDatabase, [{ migrations: usersMigsDir, seeds: "" }]);
  }

  let expConfig;
  fs.readdirSync(experimentsDir).forEach((expDir) => {
    if (verbose) console.log(`Loading migrations for ${expDir}`);
    const expDirPath = path.join(experimentsDir, expDir);

    if (!fs.lstatSync(expDirPath).isDirectory()) return;

    const expConfigPath = path.join(expDirPath, "config.yaml");
    ensureProductionDbField(expConfigPath, verbose);

    try {
      expConfig = jsYaml.load(fs.readFileSync(expConfigPath, "utf8"));
    } catch (e) {
      console.error(
        `Failed to load experiment config at ${expConfigPath}. ` +
          `Skipping experiment "${expDir}". ` +
          `Make sure config.yaml exists and contains valid YAML.\nError: ${e.message}`,
      );
      return;
    }
    if (verbose) console.log(`expConfig:\n ${JSON.stringify(expConfig)}`);

    const expDatabase = production ? expConfig.productionDB : expConfig.database;
    const migsDir = path.join(expDirPath, expConfig.migrations.location);
    const seedsDir = path.join(expDirPath, expConfig.seeds.location);

    if (dbsToExps.has(expDatabase)) {
      dbsToExps.get(expDatabase).push({ migrations: migsDir, seeds: seedsDir });
    } else {
      dbsToExps.set(expDatabase, [{ migrations: migsDir, seeds: seedsDir }]);
    }
  });

  return dbsToExps;
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
async function runMigrations(dbsToExps, dbConfigs, verbose) {
  let migrationPromises = [];
  dbsToExps.forEach((migAndSeedDirs, db) => {
    if (!dbConfigs[db]) {
      console.error(`The database ${db} is not configured in pushkin.yaml`);
      return;
    }

    let dbInfo = dbConfigs[db];
    if (!dbInfo.host) {
      if (verbose)
        console.log(`No host listed for database ${dbInfo.database}. Defaulting to 'localhost'.`);
      dbInfo.host = "localhost";
    }

    const migDirs = migAndSeedDirs.map((dir) => dir.migrations);
    const seedDirs = migAndSeedDirs.map((dir) => dir.seeds).filter(Boolean);

    const knexClient = knex(buildKnexConfig(dbInfo));

    migrationPromises.push(
      (async () => {
        if (verbose) console.log(`Running migrations for ${db}`);

        try {
          await waitForDbReady(knexClient, db);
          await knexClient.migrate.latest({ directory: migDirs });
          if (verbose) console.log(`Ran migrations for ${db}`);

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
          knexClient.destroy();
        }
      })(),
    );
  });

  return Promise.all(migrationPromises);
}

export { getMigrations, runMigrations };
