/**
 * Database Setup Phase
 * Handles database migrations and transaction table setup
 * @module aws/phases/database-setup
 */

import path from 'path';
import { runMigrations, getMigrations } from '../../setupdb/index.js';

/**
 * Run main table migrations for all experiments
 * @param {object} dbSetup - Completed database configuration
 * @returns {Promise<Map>} Migration results
 */
async function runExperimentMigrations(dbSetup) {
  console.log(`Handling main table migrations`);

  const dbsToExps = await getMigrations(
    path.join(process.cwd(), dbSetup.usersDir || 'users'),
    path.join(process.cwd(), dbSetup.experimentsDir),
    true
  );

  return runMigrations(dbsToExps, dbSetup.productionDBs);
}

/**
 * Set up transaction table with core migrations
 * @param {object} dbSetup - Completed database configuration
 * @returns {Promise} Migration results
 */
async function setupTransactionTable(dbSetup) {
  const transMigrations = new Map();
  transMigrations.set('Transaction', [
    { migrations: path.join(process.cwd(), 'coreMigrations'), seeds: '' },
  ]);

  return runMigrations(transMigrations, dbSetup.productionDBs);
}

/**
 * Set up all databases with migrations and transaction tables
 * @param {Promise<object>|object} dbSetup - Completed database configuration (can be a promise)
 * @returns {Promise<{migrations: Map, transactions: any}>}
 */
export async function setupDatabases(dbSetup) {
  console.log('Setting up databases...');

  // Resolve promise if needed
  const dbConfig = await Promise.resolve(dbSetup);

  // Run migrations and transaction setup
  const [migrations, transactions] = await Promise.all([
    runExperimentMigrations(dbConfig),
    setupTransactionTable(dbConfig)
  ]);

  return { migrations, transactions };
}
