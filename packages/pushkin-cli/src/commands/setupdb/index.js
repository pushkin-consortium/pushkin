import path from "path";
import { fileURLToPath } from "url";
import fs from "graceful-fs";
import jsYaml from "js-yaml";
import * as compose from "docker-compose";
import util from "util";
import crypto from "crypto";
import { exec as execCallback } from "child_process";
import { getMigrations, runMigrations } from "../../utils/db-migrations.js";

const exec = util.promisify(execCallback);
const coreMigrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../utils/transaction-migrations");

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
  config.databases.local.experiment.pass = testDBPass;
  composeFile.services["local-experiment-db"].environment.POSTGRES_PASSWORD = testDBPass;
  config.databases.local.transaction.pass = transactionsPass;
  composeFile.services["local-transaction-db"].environment.POSTGRES_PASSWORD = transactionsPass;
  // Write new pushkin.yaml and docker-compose.dev.yml
  fs.writeFileSync("pushkin.yaml", jsYaml.dump(config));
  fs.writeFileSync("pushkin/docker-compose.dev.yml", jsYaml.dump(composeFile));
};

/**
 * Wait for a Docker database container to be healthy.
 * Only used for local development with Docker Compose.
 * 'local-experiment-db' is the main database for experiments/users.
 * 'local-transaction-db' is the audit log database for query tracking/debugging.
 * @param {string} dockerDB - Docker database container name (e.g., 'local-experiment-db', 'local-transaction-db')
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
 * Set up the local transactions database configuration if it doesn't exist.
 *
 * The local transactions database (local-transaction-db) is an audit log that records all database
 * queries executed during local development. It helps with debugging by providing a history
 * of all operations. This is separate from the local-experiment-db which stores experiment data.
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
  if (!composeFile.services["local-transaction-db"]) {
    if (verbose)
      console.log(`No transaction db for logging found in docker-compose.dev.yml. Creating.`);

    // Add Docker Compose service for transactions database
    composeFile.services["local-transaction-db"] = {
      image: "postgres:11",
      environment: {
        POSTGRES_PASSWORD: "example",
        POSTGRES_DB: "local-transaction-db",
      },
      ports: ["5433:5432"],
      volumes: ["local-transaction-db-volume:/var/lib/postgresql/data"],
      healthcheck: {
        test: ["CMD-SHELL", "pg_isready -U postgres"],
        interval: "10s",
        timeout: "5s",
        retries: 5,
      },
    };
    composeFile.volumes["local-transaction-db-volume"] = null;

    // Write updated docker-compose file
    if (verbose) console.log(`Updating pushkin/docker-compose.dev.yml to include transaction db`);
    await fs.promises.writeFile(
      path.join(process.cwd(), "pushkin/docker-compose.dev.yml"),
      jsYaml.dump(composeFile),
    );

    // Add database config to pushkin.yaml
    if (!pushkinConfig.databases.local) pushkinConfig.databases.local = {};
    pushkinConfig.databases.local.transaction = {
      user: "postgres",
      pass: "example",
      host: "local-transaction-db",
      port: "5433",
      url: "localhost",
      name: "local-transaction-db",
    };

    // Write updated pushkin.yaml
    if (verbose) console.log(`Updating pushkin.yaml`);
    await fs.promises.writeFile(
      path.join(process.cwd(), "pushkin.yaml"),
      jsYaml.dump(pushkinConfig),
    );
  }
  if (verbose) console.log("Finished updating configs for test transactions db");
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
  await waitForDockerDBContainerReady("local-transaction-db", verbose);

  // Set up migrations map
  if (verbose) console.log(`Starting migrations for local transaction DB.`);
  const transMigrations = new Map();
  transMigrations.set("transaction", [
    { migrations: coreMigrationsDir, seeds: "" },
  ]);

  // Run migrations
  return runMigrations(transMigrations, coreDBs, verbose);
}

/**
 * Wait for main test database to be healthy, then run migrations.
 * The main local database (local-experiment-db) stores experiment data and user accounts.
 * @param {Map} dbMigrationsMap - Map of database names to migration/seed paths
 * @param {object} coreDBs - Database configurations from pushkin.yaml
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise} Promise that resolves when migrations complete
 */
async function migrateExperimentsDB(dbMigrationsMap, coreDBs, verbose) {
  await waitForDockerDBContainerReady("local-experiment-db", verbose);
  return runMigrations(dbMigrationsMap, coreDBs, verbose);
}

/**
 * Ensures a clean state by detecting and removing existing database containers
 * This prevents issues with stale containers that may have different credentials
 * @param {boolean} verbose Output extra debugging info
 * @returns {Promise<void>}
 */
async function ensureCleanState(verbose) {
  if (verbose) console.log("--verbose flag set inside ensureCleanState()");

  // Check for existing containers (stopped or running)
  let containersExist = false;
  try {
    const { stdout } = await exec(
      `docker ps -a --format "{{.Names}}" | grep -E "pushkin[-_](local-experiment-db|local-transaction-db)[-_]"`,
    );
    containersExist = stdout.trim().length > 0;
  } catch (e) {
    // If grep finds nothing, it returns exit code 1, which throws an error
    // This is expected when no containers exist, so we can safely ignore it
    if (!(e.code === 1 && e.stderr === "")) {
      console.warn("Warning: Could not check for existing containers:", e.message);
    }
  }

  // Check for orphaned volumes (containers removed without removing their volumes)
  let volumesExist = false;
  try {
    // The Docker Compose project name is always "pushkin" because every compose.* call uses
    // cwd: path.join(..., "pushkin").
    // Compose v2 stamps volumes with a com.docker.compose.project label we can query.
    const { stdout } = await exec(
      `docker volume ls --filter "label=com.docker.compose.project=pushkin" -q`,
    );
    volumesExist = stdout.trim().length > 0;
  } catch (e) {
    console.warn("Warning: Could not check for existing volumes:", e.message);
  }

  if (containersExist || volumesExist) {
    if (verbose) {
      console.log(
        `⚠️  Found existing state (containers: ${containersExist}, orphaned volumes: ${volumesExist && !containersExist}). Cleaning up...`,
      );
    }
    const dockerPath = path.join(process.cwd(), "pushkin");
    const dockerConfig = "docker-compose.dev.yml";
    try {
      await compose.down({
        cwd: dockerPath,
        config: dockerConfig,
        commandOptions: ["--volumes"],
      });
      if (verbose) console.log("✓ Cleanup complete.");
    } catch (err) {
      console.warn("Warning during cleanup:", err.message || JSON.stringify(err));
    }
  } else {
    if (verbose)
      console.log("✓ No existing containers or volumes found. Proceeding with fresh setup.");
  }
}

/**
 * Set up all databases by running migrations and seeds.
 * This is the main orchestration function that:
 * 1. Ensures clean state (removes stale containers/volumes)
 * 2. Starts Docker containers for test databases:
 *    - local-experiment-db: Main database for experiments and user accounts
 *    - local-transaction-db: Audit log database for query tracking/debugging
 * 3. Collects all migrations from experiments and users
 * 4. Waits for database containers to be healthy
 * 5. Runs migrations and seeds in parallel
 * 6. Stops all database containers when done
 * @param {object} coreDBs - Database configurations object from pushkin.yaml
 * @param {string} usersDir - Path to users directory
 * @param {string} mainExpDir - Path to main experiments directory
 * @param {boolean} verbose - Whether to enable verbose logging
 * @returns {Promise} Promise that resolves when setup is complete
 */
export async function setupdb(coreDBs, usersDir, mainExpDir, verbose) {
  // === 1. Ensure clean state (remove stale containers/volumes) ===
  await ensureCleanState(verbose);

  // === 2. Start Docker containers for test databases ===
  // local-experiment-db: Main database for experiments/users
  // local-transaction-db: Audit log (records all queries for debugging)
  // Note: Knex requires all migrations for the same DB to be run together
  if (verbose) console.log("Spooling up Docker containers for test databases.");
  const dbPromise = compose.upMany(["local-experiment-db", "local-transaction-db"], {
    cwd: path.join(process.cwd(), "pushkin"),
    config: "docker-compose.dev.yml",
  });

  // === 3. Collect all migrations from experiments and users ===
  const dbMigrationsMap = await getMigrations(usersDir, mainExpDir, false, verbose);

  // === 4. Wait for database containers to start before proceeding ===
  await dbPromise;

  // === 5. Run migrations and seeds in parallel ===
  const setupTransactionsTable = migrateTransactionsDB(coreDBs, verbose);
  const experimentMigrationsPromise = migrateExperimentsDB(dbMigrationsMap, coreDBs, verbose);
  await Promise.all([experimentMigrationsPromise, setupTransactionsTable]);

  if (verbose) console.log("Finished running all migrations. Shutting down database containers.");

  // === 6. Stop all database containers ===
  return await compose.stop({
    cwd: path.join(process.cwd(), "pushkin"),
    config: "docker-compose.dev.yml",
  });
}
