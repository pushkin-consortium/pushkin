/**
 * AWS Deployment Databases Provisioning Phase
 * Handles provisioning of RDS databases on AWS for deployment.
 * @module aws/phases/provision-databases
 */

import { loadPushkinConfig } from "../../../utils/pushkin-config.js";
import { ensureDatabaseSecurityGroup } from "../services/security.js";
import { createDb } from "../services/rds.js";

/**
 * Provisions databases for the AWS deployment.
 * Each DB writes its credentials to pushkin.yaml immediately on success, so a partial
 * failure doesn't orphan already-created databases without saved credentials.
 * @param {string} projectName
 * @returns {Promise<object>} - A promise that resolves to the updated pushkin config.
 */
async function provisionDbs(projectName) {
  const securityGroupID = await ensureDatabaseSecurityGroup(projectName);

  await Promise.all([
    createDb("experiment", securityGroupID, projectName),
    createDb("transaction", securityGroupID, projectName),
  ]);

  return loadPushkinConfig();
}

export { provisionDbs };
