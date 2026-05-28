/**
 * AWS Deployment Databases Provisioning Phase
 * Handles provisioning of RDS databases for AWS deployment.
 * @module aws/phases/provision-databases
 */

import { ensureDatabaseSecurityGroup } from "../services/security.js";
import { createDb, recordDbs } from "../services/rds.js";

/**
 * Provisions databases for the AWS deployment.
 * @param {string} awsProfileName - The AWS IAM profile
 * @param {string} projectName - The name of the project.
 * @returns {Promise<object>} - A promise that resolves to the completed databases.
 */
async function provisionDbs(awsProfileName, projectName) {
  const securityGroupID = await ensureDatabaseSecurityGroup(awsProfileName, projectName);

  const initializedMainDb = createDb("Main", securityGroupID, projectName, awsProfileName);
  const initializedTransactionDb = createDb(
    "Transaction",
    securityGroupID,
    projectName,
    awsProfileName,
  );

  const dbSetup = await recordDbs(Promise.all([initializedMainDb, initializedTransactionDb]));

  return dbSetup;
}

export { provisionDbs };
