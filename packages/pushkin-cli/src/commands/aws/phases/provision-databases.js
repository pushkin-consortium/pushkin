/**
 * AWS Deployment Databases Provisioning Phase
 * Handles provisioning of RDS databases on AWS for deployment.
 * @module aws/phases/provision-databases
 */

import { ensureDatabaseSecurityGroup } from "../services/security.js";
import { createDb, recordDbs } from "../services/rds.js";

/**
 * Provisions databases for the AWS deployment.
 * @param {string} projectName - The name of the project.
 * @returns {Promise<object>} - A promise that resolves to the completed databases.
 */
async function provisionDbs(projectName) {
  const securityGroupID = await ensureDatabaseSecurityGroup(projectName);

  const initializedMainDb = createDb("experiment", securityGroupID, projectName);
  const initializedTransactionDb = createDb(
    "transaction",
    securityGroupID,
    projectName,
  );

  const dbSetup = await recordDbs(Promise.all([initializedMainDb, initializedTransactionDb]));

  return dbSetup;
}

export { provisionDbs };
