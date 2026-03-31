import {
  CloudFrontClient,
  GetOriginAccessControlCommand,
  ListOriginAccessControlsCommand,
  CreateOriginAccessControlCommand,
  DeleteOriginAccessControlCommand,
  GetDistributionCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionConfigCommand,
  ListTagsForResourceCommand,
} from "@aws-sdk/client-cloudfront";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { readAwsResources, updateAwsResourcesField } from "../utils/aws-resources.js";
import { OriginAccessControl } from "../awsConfigs.js";
import { AWS_REGION } from "../constants.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

// Creates a CloudFront client with consistent configuration
// WHY: Ensure all CloudFront operations use the same region and IAM profile.
const createCloudFrontClient = (useIAM) => {
  const clientFactory = new AWSClientFactory(AWS_REGION, useIAM);
  return clientFactory.createClient(CloudFrontClient);
};

/**
 * Waits for CloudFront distribution to be fully deployed
 * WHY: So we don't try to access site or make changes before it's ready, which will fail.
 * @param {string} distributionId - The CloudFront distribution ID
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<void>} – Resolves when the distribution is deployed
 * @throws Will throw an error if there is a problem checking the distribution status, which may
 * indicate AWS issues that need to be resolved before deployment can complete.
 */
const waitForCloudFrontDeployment = async (distributionId, useIAM) => {
  const config = loadAwsConfig();
  const cloudFrontClient = createCloudFrontClient(useIAM);
  const { maxChecks, checkInterval } = config.timeouts.cloudfront; 
  const totalMinutes = Math.round((maxChecks * checkInterval) / 60);

  console.log(`\nWaiting for CloudFront distribution to be fully deployed...`);
  console.log(
    `This can take 5-15 minutes. Checking status every ${checkInterval} seconds (max ${totalMinutes} min).`,
  );

  let deployed = false;
  let checkCount = 0;

  while (!deployed && checkCount < maxChecks) {
    try {
      const response = await cloudFrontClient.send(
        new GetDistributionCommand({ Id: distributionId }),
      );

      const status = response.Distribution.Status;
      checkCount++;

      if (status === "Deployed") {
        deployed = true;
        console.log(`\n✓ CloudFront distribution is now fully deployed and ready!`);
      } else {
        process.stdout.write(`.`); // Show progress without newline
        await new Promise((resolve) => setTimeout(resolve, checkInterval * 1000));
      }
    } catch (error) {
      console.error(`\nError checking CloudFront status: ${error.message}`);
      throw error;
    }
  }

  if (!deployed) {
    const totalMinutesElapsed = (maxChecks * checkInterval) / 60;
    console.log(
      `\n⚠ CloudFront distribution is still deploying after ${totalMinutesElapsed} minutes.`,
    );
    console.log(`Your site may not be immediately accessible. Check the status with:`);
    console.log(
      `aws cloudfront get-distribution --id ${distributionId} --query 'Distribution.Status'`,
    );
  }

  console.log(); // Add newline after progress dots
};

/**
 * (Helper)
 * Creates a new OAC (Origin Access Control) in AWS if no existing OAC
 * WHY: OAC is AWS's modern security mechanism that allows CloudFront to access private S3 buckets
 * without making them public
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<string>} The OAC ID
 * @throws Will throw an error if OAC creation fails, which is critical to fix as it will block
 * front-end deployment.
 */
const createOAC = async (useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(
      new CreateOriginAccessControlCommand({
        OriginAccessControlConfig: OriginAccessControl,
      }),
    );
    return response.OriginAccessControl.Id;
  } catch (error) {
    console.error(`Unable to create Origin Access Control: ${error.message}`);
    throw error;
  }
};

/**
 * (Helper)
 * Checks if an OAC resource still exists in AWS by ID
 * WHY: Check if an OAC cached in awsResources.js is still valid.
 * @param {string} oacId - The OAC ID to check
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<boolean>} True if OAC exists
 * @throws Will throw an error if there is a problem communicating with AWS to check the OAC
 */
const oacExistsById = async (oacId, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    await cloudFrontClient.send(new GetOriginAccessControlCommand({ Id: oacId }));
    return true;
  } catch {
    return false;
  }
};

/**
 * (Helper)
 * Finds an existing OAC resource by name
 * WHY: Prevent creating duplicate OACs when redeploying, as they are reusable across deployments.
 * Mostly acts as a fallback if oacExistsById returns false (i.e. local state lost) but the OAC
 * still exists in AWS.
 * @param {string} oacName - The OAC name to find
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<string|null>} The OAC ID if found, null otherwise
 * @throws Will throw an error if there is a problem communicating with AWS to find OAC
 */
const findOACByName = async (oacName, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));

    const existingOAC = response.OriginAccessControlList?.Items?.find(
      (oac) => oac.Name === oacName,
    );

    return existingOAC ? existingOAC.Id : null;
  } catch (error) {
    console.error(`Error searching for OAC by name ${oacName}: ${error.message}`);
    return null;
  }
};

/**
 * Gets or creates the Origin Access Control (OAC)
 * WHY: Implements idempotent OAC management with three fallback strategies:
 * 1. Use saved OAC ID if it exists in AWS
 * 2. Find existing OAC by name (recovery path if local state is stale)
 * 3. Create new OAC (no OAC at all – e.g. first deployment)
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<string>} The OAC ID
 * @throws Will throw an error downstream if finding OAC by name or ID, or creating a new one, fails
 */
const getOAC = async (useIAM) => {
  console.log(`Checking to see if OAC already exists.`);
  const awsResources = readAwsResources();

  // Check if we have a saved OAC ID and if it still exists in AWS
  if (awsResources.OAC) {
    const exists = await oacExistsById(awsResources.OAC, useIAM);
    if (exists) {
      return awsResources.OAC;
    }
    console.log(`Saved OAC ID not found in AWS. Will search for updated ID on AWS by OAC name.`);
  }

  // Try to find an existing OAC with our name
  const existingOACId = await findOACByName(OriginAccessControl.Name, useIAM);

  let oacId;
  if (existingOACId) {
    console.log(`Found existing OAC with name ${OriginAccessControl.Name}, reusing it.`);
    oacId = existingOACId;
  } else {
    // Create a new OAC
    console.log(`Creating new OAC.`);
    oacId = await createOAC(useIAM);
  }

  updateAwsResourcesField("OAC", oacId);
  return oacId;
};

// Gets list of tags of Cloudfront distributions
const getDistributionTags = async (arn, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListTagsForResourceCommand({ Resource: arn }));
    return response.Tags?.Items || [];
  } catch {
    console.error(`Unable to get tags for cloudfront distribution ${arn}`);
    return [];
  }
};

// Verifies a distribution belongs to the current Pushkin project.
// WHY: This prevents accidentally deleting distributions from other projects or non-Pushkin
// resources in shared AWS accounts
const isDistributionTaggedForProject = async (distribution, projName, useIAM) => {
  const tags = await getDistributionTags(distribution.ARN, useIAM);
  return tags.some((tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === projName);
};

/**
 * Gets list of distribution IDs to delete
 * WHY: Supports two deletion modes: targeted (project-specific) and total (all distributions).
 * The killTag parameter determines behavior - when true, only deletes distributions tagged
 * for this project (safe for shared accounts); when false, deletes all (for cleanup/testing).
 * @param {string} useIAM - The IAM profile to use
 * @param {string} projName - The project name
 * @param {boolean} killTag - Whether to filter by project tag
 * @returns {Promise<Array<string>>} Array of distribution IDs
 */
const getDistributionsToDelete = async (useIAM, projName, killTag) => {
  const cloudFrontClient = createCloudFrontClient(useIAM);
  const response = await cloudFrontClient.send(new ListDistributionsCommand({}));

  const items = response.DistributionList?.Items || [];
  if (items.length === 0) {
    return [];
  }

  if (!killTag) {
    // Delete all distributions
    return items.map((d) => d.Id);
  }

  // Filter by project tag
  const distributionIds = [];
  for (const distribution of items) {
    if (await isDistributionTaggedForProject(distribution, projName, useIAM)) {
      distributionIds.push(distribution.Id);
    }
  }
  return distributionIds;
};

/**
 * Checks if a CloudFront distribution is disabled and ready for deletion
 *
 * WHY: CloudFront requires a two-step deletion process: first disable the distribution,
 * then delete it after disabling completes. This checks both conditions (Enabled=false
 * and Status!="InProgress") to ensure the distribution is in a safe state for deletion.
 * @param {string} distId - The distribution ID
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<boolean>} True if ready for deletion
 */
const isDistributionReadyForDeletion = async (distId, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListDistributionsCommand({}));

    const distribution = response.DistributionList?.Items?.find((d) => d.Id === distId);

    if (!distribution) {
      console.error(`Unable to find cloudfront distribution ${distId}. That is very strange.`);
      return false;
    }

    return distribution.Enabled === false && distribution.Status !== "InProgress";
  } catch (error) {
    console.error(`Unable to check cloudfront distribution status`);
    throw error;
  }
};

/**
 * Delete the CloudFront distribution(s) associated with this project (or all distributions if killTag is false)
 *
 * Why: Orchestrates the complete CloudFront deletion workflow which must follow AWS's
 * required sequence: get config → disable → wait for disable to propagate → get fresh
 * ETag → delete. The ETag must be refreshed after disabling because AWS updates it when
 * the configuration changes. Handles multiple distributions in parallel for efficiency.
 * @param {string} useIAM – The IAM profile to use
 * @param {string} projName – The Pushkin project name
 * @param {boolean} killTag – Whether to delete only distributions tagged with the project name
 * @returns {Promise<boolean>} – Resolves true if deletion process initiated successfully, false if there was a problem
 */
const deleteCloudFront = async (useIAM, projName, killTag) => {
  // Get list of distributions to delete
  let distributions;
  try {
    distributions = await getDistributionsToDelete(useIAM, projName, killTag);
  } catch (error) {
    console.error(`Unable to get list of cloudfront distributions`);
    throw error;
  }

  if (distributions.length === 0) {
    console.log(`No cloudfront distributions found. Skipping.`);
    return true;
  }

  // Disable and delete each distribution
  return Promise.all(
    distributions.map(async (distId) => {
      // Get current distribution config
      let cloudConfig;
      let ETag;
      try {
        const cloudFrontClient = createCloudFrontClient(useIAM);
        const response = await cloudFrontClient.send(
          new GetDistributionConfigCommand({ Id: distId }),
        );
        cloudConfig = response.DistributionConfig;
        ETag = response.ETag;
      } catch {
        console.log(
          `Cannot find cloudfront distribution ${distId}. May have already been deleted. Skipping.`,
        );
        return true;
      }

      // Disable the distribution
      cloudConfig.Enabled = false;
      console.log(`Disabling cloudfront distribution ${distId}`);

      try {
        const cloudFrontClient = createCloudFrontClient(useIAM);
        await cloudFrontClient.send(
          new UpdateDistributionCommand({
            Id: distId,
            IfMatch: ETag,
            DistributionConfig: cloudConfig,
          }),
        );
      } catch {
        console.error(
          `Possibly unable to disable cloudfront distribution ${distId}.\n Sometimes this throws errors but works anyway, so we'll continue and see what happens...\n`,
        );
      }

      // Wait for distribution to be disabled, then delete it
      return new Promise((resolve) => {
        const waitAndDelete = async () => {
          const ready = await isDistributionReadyForDeletion(distId, useIAM);

          if (ready) {
            console.log(`Cloudfront is disabled. Deleting.`);

            // Get fresh ETag (it changes after disabling)
            try {
              const cloudFrontClient = createCloudFrontClient(useIAM);
              const configResponse = await cloudFrontClient.send(
                new GetDistributionConfigCommand({ Id: distId }),
              );
              await cloudFrontClient.send(new GetDistributionCommand({ Id: distId }));

              ETag = configResponse.ETag;

              // Delete the distribution
              await cloudFrontClient.send(
                new DeleteDistributionCommand({ Id: distId, IfMatch: ETag }),
              );

              // Update awsResources.js
              updateAwsResourcesField("cloudFrontId", null);
              resolve(true);
            } catch (error) {
              console.error(`Error during CloudFront deletion: ${error.message}`);

              // Check if distribution is still in progress
              try {
                const cloudFrontClient = createCloudFrontClient(useIAM);
                const distResponse = await cloudFrontClient.send(
                  new GetDistributionCommand({ Id: distId }),
                );

                if (distResponse.Distribution.Status !== "InProgress") {
                  console.error(
                    `Unable to delete cloudfront distribution. It may be worth running pushkin aws armageddon again.`,
                  );
                  resolve(false);
                } else {
                  resolve(distResponse);
                }
              } catch {
                console.error(`Suddenly can't find cloudfront distribution ${distId}. Skipping...`);
                resolve(true);
              }
            }
          } else {
            const config = loadAwsConfig();
            const waitInterval = config.timeouts.cloudfront.checkInterval * 1000;
            console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
            setTimeout(waitAndDelete, waitInterval);
          }
        };

        console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
        waitAndDelete();
      });
    }),
  );
};

/**
 * Deletes an OAC with retry logic for in-use errors
 *
 * Why: AWS CloudFront backend has eventual consistency - even after distributions are
 * deleted, AWS may still report the OAC as "in use" for a short period. Retrying with
 * delays (10 attempts, 10 seconds apart) gives AWS time to fully release the OAC
 * references, preventing deletion failures during cleanup operations.
 * @param {string} oacId - The OAC ID
 * @param {string} etag - The OAC ETag
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<void>}
 */
const deleteOACWithRetry = async (oacId, etag, useIAM) => {
  const maxRetries = 10;
  const waitTime = 10000; // 10 seconds between retries

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const cloudFrontClient = createCloudFrontClient(useIAM);
      await cloudFrontClient.send(
        new DeleteOriginAccessControlCommand({ Id: oacId, IfMatch: etag }),
      );
      return; // Success
    } catch (error) {
      // If it's still in use and we have retries left, wait and retry
      if (error.name === "OriginAccessControlInUse" && attempt < maxRetries - 1) {
        console.log(
          `OAC ${oacId} still in use, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Other error or final attempt - throw
      console.error(`Unable to delete origin access control ${oacId}`);
      console.error(`Failed to delete origin access control ${oacId}`);
      console.error(error);
      throw error;
    }
  }
};

/**
 * Delete all Origin Access Controls
 *
 * Why: OACs cannot be deleted while still referenced by CloudFront distributions. This
 * function enforces the correct deletion order: wait for distributions to be deleted
 * first, then wait additional time for AWS backend to fully release the references
 * (eventual consistency), then delete OACs with retry logic. Updates local state to
 * keep awsResources.js in sync.
 * @param {string} useIAM - The IAM profile to use
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront distributions are deleted
 * @returns {Promise<boolean>} True if successful
 */
const deleteOACs = async (useIAM, deletedCloudFront) => {
  // Wait for CloudFront distributions to be deleted
  await deletedCloudFront;

  // Wait for CloudFront to fully release OAC references on AWS backend
  const config = loadAwsConfig();
  const waitInterval = config.timeouts.cloudfront.checkInterval * 1000;
  console.log(
    `Waiting ${waitInterval / 1000} seconds for CloudFront to fully release OAC references...`,
  );
  await new Promise((resolve) => setTimeout(resolve, waitInterval));

  // Get list of OACs
  let oacList;
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));
    oacList = response.OriginAccessControlList?.Items || [];
  } catch (error) {
    console.error(`Unable to get list of origin access controls`);
    throw error;
  }

  if (oacList.length === 0) {
    console.log(`No origin access controls found. Skipping.`);
    return true;
  }

  // Delete each OAC
  for (const oac of oacList) {
    // Get ETag
    let etag;
    try {
      const cloudFrontClient = createCloudFrontClient(useIAM);
      const response = await cloudFrontClient.send(
        new GetOriginAccessControlCommand({ Id: oac.Id }),
      );
      etag = response.ETag;
    } catch (error) {
      console.error(`Unable to get etag for origin access control ${oac.Id}`);
      throw error;
    }

    // Delete with retry logic
    await deleteOACWithRetry(oac.Id, etag, useIAM);

    // Update awsResources.js
    console.log(`Updating awsResources with cloudfront info`);
    updateAwsResourcesField("OAC", null);
  }

  return true;
};
// Export all functions
export { waitForCloudFrontDeployment, getOAC, deleteCloudFront, deleteOACs };
