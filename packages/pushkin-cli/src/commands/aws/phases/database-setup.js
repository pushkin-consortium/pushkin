/**
 * Database Setup Phase
 * Handles database migrations and transaction table setup
 * @module aws/phases/database-setup
 */

import path from 'path';
import { runMigrations, getMigrations } from '../../setupdb/index.js';

/**
 * Run main table migrations for all experiments
 * @param {object} completedDBs - Completed database configuration
 * @returns {Promise<Map>} Migration results
 */
async function runExperimentMigrations(completedDBs) {
  console.log(`Handling main table migrations`);

  const dbsToExps = await getMigrations(
    path.join(process.cwd(), completedDBs.usersDir || 'users'),
    path.join(process.cwd(), completedDBs.experimentsDir),
    true
  );

  return runMigrations(dbsToExps, completedDBs.productionDBs);
}

/**
 * Set up transaction table with core migrations
 * @param {object} completedDBs - Completed database configuration
 * @returns {Promise} Migration results
 */
async function setupTransactionTable(completedDBs) {
  const transMigrations = new Map();
  transMigrations.set('Transaction', [
    { migrations: path.join(process.cwd(), 'coreMigrations'), seeds: '' },
  ]);

  return runMigrations(transMigrations, completedDBs.productionDBs);
}

/**
 * Set up all databases with migrations and transaction tables
 * @param {Promise<object>|object} completedDBs - Completed database configuration (can be a promise)
 * @returns {Promise<{migrations: Map, transactions: any}>}
 */
export async function setupDatabases(completedDBs) {
  console.log('Setting up databases...');

  // Resolve promise if needed
  const dbConfig = await Promise.resolve(completedDBs);

  // Run migrations and transaction setup
  const [migrations, transactions] = await Promise.all([
    runExperimentMigrations(dbConfig),
    setupTransactionTable(dbConfig)
  ]);

  return { migrations, transactions };
}
