/**
 * Infrastructure Provisioning Phase
 * Handles creation of core AWS infrastructure: databases, security groups, S3, and front-end building
 * @module aws/phases/infrastructure
 */

import path from "path";
import { createDB, recordDBs } from "../services/rds.js";
import { buildFrontEnd } from "../services/s3.js";
import { ensureDatabaseSecurityGroup } from "../services/security.js";
import { createLogGroup } from "../services/monitoring.js";

/**
 * Provision core AWS infrastructure resources
 * Creates databases, security groups, S3 bucket, and builds front-end
 * @param {object} config - Pushkin configuration
 * @param {string} profileName - AWS profile name
 * @param {string} projName - Project name
 * @returns {Promise<{completedDBs: object, builtFrontEnd: Promise, securityGroupID: string}>}
 */
export async function provisionInfrastructure(config, profileName, projName) {
  console.log("Provisioning AWS infrastructure...");

  // Create security group for databases
  const securityGroupID = await ensureDatabaseSecurityGroup(profileName, projName);

  // Create CloudWatch log group for ECS
  createLogGroup(profileName, projName);

  // Initialize databases (takes longest, so start early)
  const initializedMainDB = createDB("Main", securityGroupID, projName, profileName);
  const initializedTransactionDB = createDB("Transaction", securityGroupID, projName, profileName);

  let completedDBs;
  try {
    completedDBs = await recordDBs(Promise.all([initializedMainDB, initializedTransactionDB]));
  } catch (e) {
    console.error("Failed to record databases:", e);
    throw e;
  }

  // Build front-end (can run in parallel with other operations)
  const builtFrontEnd = buildFrontEnd(projName);

  return {
    completedDBs,
    builtFrontEnd,
    securityGroupID,
  };
}
