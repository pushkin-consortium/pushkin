/**
 * AWS Deployment Migrate Databases Phase
 * Handles experiment database and transaction database migrations
 * @module aws/phases/migrate-databases
 */

import path from "path";
import { runMigrations, getMigrations } from "../../../utils/db-migrations.js";

const TRANSACTION_MIGRATIONS_DIR = path.join(__dirname, "../../../utils/transaction-migrations");

async function migrateExperimentDb(dbConfig) {
  const experimentMigrations = await getMigrations(
    dbConfig.usersDir,
    dbConfig.experimentsDir,
    true,
  );
  return runMigrations(experimentMigrations, dbConfig.databases.production);
}

async function migrateTransactionDb(dbConfig) {
  const transactionMigrations = new Map();
  transactionMigrations.set("transaction", [
    { migrations: TRANSACTION_MIGRATIONS_DIR, seeds: null },
  ]);
  return runMigrations(transactionMigrations, dbConfig.databases.production);
}

/**
 * Run all database migrations and transaction table setup.
 * @param {Promise<object>} dbSetup - Promise resolving to database configuration from provisioning phase
 * @returns {Promise<{experiment: Map, transaction: any}>}
 */
async function migrateDbs(dbSetup) {
  const dbConfig = await dbSetup;
  const [experimentMigrations, transactionMigrations] = await Promise.all([
    migrateExperimentDb(dbConfig),
    migrateTransactionDb(dbConfig),
  ]);
  return {
    experiment: experimentMigrations,
    transaction: transactionMigrations,
  };
}

export { migrateDbs };
