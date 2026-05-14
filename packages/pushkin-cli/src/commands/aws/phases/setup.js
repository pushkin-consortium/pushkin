/**
 * AWS Deployment Setup Phase
 * Handles configuration loading, IAM verification, and initial setup for AWS deployment
 * @module aws/phases/setup
 */

import { verifyIAMCredentials } from "../services/security.js";
import { loadPushkinConfig, savePushkinConfig } from "../../../utils/pushkin-config.js";

/**
 * Initialize deployment - verify credentials and load configurations
 * @param {string|object} useIAM - AWS profile name or object with iam property
 * @returns {Promise<{profileName: string, config: object, resources: object, isUpdate: boolean}>}
 */
export async function initializeDeployment(useIAM) {
  // Normalize useIAM to always be a string
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;

  // Verify AWS credentials
  await verifyIAMCredentials(profileName);

  // Load Pushkin config
  let config;
  try {
    config = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  return { profileName, config };
}

/**
 * Update pushkin.yaml with deployment information
 * @param {object} config - Pushkin configuration object
 * @param {string} projName - Project name
 * @param {string} s3BucketName - S3 bucket name
 * @param {string} domain - Domain name for the site
 * @returns {Promise<object>} Updated configuration
 */
export async function updateDeploymentConfig(config, projName, s3BucketName, domain) {
  config.info.rootDomain = domain;
  config.info.projName = projName;
  config.info.s3BucketName = s3BucketName;

  try {
    await savePushkinConfig(config);
    console.log(`Successfully updated pushkin.yaml with deployment information.`);
  } catch (error) {
    console.error(`Failed to save pushkin.yaml:`, error);
    throw error;
  }

  return config;
}
