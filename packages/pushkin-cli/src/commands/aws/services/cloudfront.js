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

/**
 * (Helper)
 * Creates a CloudFront client with consistent configuration using the same region and IAM profile
 */
const createCloudFrontClient = (useIAM) => {
  const clientFactory = new AWSClientFactory(AWS_REGION, useIAM);
  return clientFactory.createClient(CloudFrontClient);
};

/**
 * (Helper)
 * Checks if an OAC resource still exists in AWS by ID
 * WHY: Check if an OAC cached in awsResources.js is still valid
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
 * still exists in AWS
 */
const findOACByName = async (oacName, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));

    const existingOAC = response.OriginAccessControlList?.Items?.find(
      (oac) => oac.Name === oacName,
    );

    return existingOAC ? existingOAC.Id : null;
  } catch {
    return null;
  }
};

/**
 * (Helper)
 * Creates a new OAC (Origin Access Control) in AWS if no existing OAC
 * WHY: OACs are required for secure CloudFront-S3 access
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
 * Gets or creates the Origin Access Control (OAC)
 * WHY: Implements idempotent OAC management with three fallback strategies:
 * 1. Use saved OAC ID if it exists in AWS
 * 2. Find existing OAC by name (recovery path if local state is stale)
 * 3. Create new OAC (no OAC at all – e.g. first deployment)
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose – Whether to log detailed info about the OAC retrieval/creation process
 * @returns {Promise<string>} The OAC ID
 * @throws Will throw an error downstream if finding OAC by name or ID, or creating a new one, fails
 */
const getOAC = async (useIAM, verbose = false) => {
  const awsResources = readAwsResources();
  if (verbose) {
    console.log(`Retrieving Origin Access Control (OAC) for CloudFront...`);
  }

  // Check if we have a saved OAC ID and if it still exists in AWS
  if (verbose) {
    console.log(`Checking to see if OAC already exists.`);
  }
  if (awsResources.OAC) {
    const exists = await oacExistsById(awsResources.OAC, useIAM);
    if (exists) {
      return awsResources.OAC;
    }
  }

  // Try to find an existing OAC with our cached name
  if (verbose) {
    console.log(`Saved OAC ID not found in AWS. Will search for updated ID on AWS by OAC name.`);
  }
  const existingOACId = await findOACByName(OriginAccessControl.Name, useIAM);
  let oacId;
  if (existingOACId) {
    if (verbose) {
      console.log(`Found existing OAC with name ${OriginAccessControl.Name}, reusing it.`);
    }
    oacId = existingOACId;
  } else {
    if (verbose) {
      console.log(`No OAC with name ${OriginAccessControl.Name}, creating new OAC.`);
    }
    oacId = await createOAC(useIAM);
  }

  updateAwsResourcesField("OAC", oacId);
  return oacId;
};

/**
 * Waits for CloudFront distribution to be fully deployed
 * WHY: So we don't try to access site or make changes before it's ready, which will fail
 * @param {string} distributionId - The CloudFront distribution ID
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose - Whether to log detailed info about the deployment status checks
 * @returns {Promise<void>} – Resolves when the distribution is deployed
 * @throws Will throw an error if there is a problem checking the distribution status, which may
 * indicate AWS issues that need to be resolved before deployment can complete.
 */
const waitForCloudFrontDeployment = async (distributionId, useIAM, verbose = false) => {
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

  // Poll the distribution status until it's "Deployed" or we hit the max check limit
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
        if (verbose) {
          process.stdout.write(` (Check ${checkCount}/${maxChecks}, Status: ${status})`);
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval * 1000));
      }
    } catch (error) {
      console.error(`\nError checking CloudFront status: ${error.message}`);
      throw error;
    }
  }

  // If we exit the loop without deployment, log a warning but continue (the distribution may still deploy soon)
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
 * Gets the tags for a CloudFront distribution by ARN
 * WHY: Used to check if a distribution is tagged for this project, which helps prevent
 * accidentally deleting distributions from other projects in shared AWS accounts
 */
const getDistributionTags = async (arn, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListTagsForResourceCommand({ Resource: arn }));
    return response.Tags?.Items || [];
  } catch {
    return [];
  }
};

/**
 * (Helper)
 * Verifies a distribution belongs to the current Pushkin project
 * WHY: This prevents accidentally deleting distributions from other projects or non-Pushkin
 * resources in shared AWS accounts
 */
const isDistributionTaggedForProject = async (distribution, projName, useIAM) => {
  const tags = await getDistributionTags(distribution.ARN, useIAM);
  return tags.some((tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === projName);
};

/**
 * (Helper)
 * Gets list of distribution IDs to delete
 * WHY: Supports two deletion modes: targeted (project-specific) and total (all distributions)
 * The killTag parameter determines behavior - when true, only deletes distributions tagged
 * for this project (safe for shared accounts); when false, deletes all (for cleanup/testing).
 */
const getDistributionsToDelete = async (useIAM, projName, killTag) => {
  const cloudFrontClient = createCloudFrontClient(useIAM);
  const response = await cloudFrontClient.send(new ListDistributionsCommand({}));

  const items = response.DistributionList?.Items || [];
  if (items.length === 0) {
    return [];
  }

  if (!killTag) {
    // TODO: killTag should be renamed to default
    // Delete all distributions
    return items.map((d) => d.Id);
  } else {
    const distributionIds = [];

    // Filter by project tag
    if (!projName) {
      throw new Error("Project name is missing but required to delete tagged distributions.");
    } else {
      for (const distribution of items) {
        if (await isDistributionTaggedForProject(distribution, projName, useIAM)) {
          distributionIds.push(distribution.Id);
        }
      }
    }

    return distributionIds;
  }
};

/**
 * (Helper)
 * Checks if a CloudFront distribution is disabled and ready for deletion
 * WHY: CloudFront requires a two-step deletion process: first disable the distribution,
 * then delete it after disabling completes. This checks both conditions (Enabled=false
 * and Status!="InProgress") to ensure the distribution is in a safe state for deletion
 */
const isDistributionReadyForDeletion = async (distId, useIAM) => {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new GetDistributionCommand({ Id: distId }));

    return (
      response.Distribution.DistributionConfig.Enabled === false &&
      response.Distribution.Status !== "InProgress"
    );
  } catch (error) {
    // NoSuchDistribution means it's already deleted (ready for deletion)
    if (error.name === "NoSuchDistribution") {
      return true;
    }
    console.error(`Unable to check cloudfront distribution status: ${error.message}`);
    throw error;
  }
};

/**
 * Delete the CloudFront distribution(s) associated with this project (or all distributions if killTag is false)
 * WHY: Orchestrates the complete CloudFront deletion workflow which must follow AWS's
 * required sequence: get config → disable → wait for disable to propagate → get fresh
 * ETag → delete. The ETag must be refreshed after disabling because AWS updates it when
 * the configuration changes. Handles multiple distributions in parallel for efficiency
 * @param {string} useIAM – The IAM profile to use
 * @param {string} projName – The Pushkin project name
 * @param {boolean} killTag – Whether to delete only distributions tagged with the project name
 * @param {boolean} verbose – Whether to log detailed info about the deletion process
 * @returns {Promise<boolean>} – Resolves true if deletion process initiated successfully, false if there was a problem
 */
const deleteCloudFront = async (useIAM, projName, killTag, verbose = false) => {
  // Get list of distributions to delete
  let distributions;
  try {
    distributions = await getDistributionsToDelete(useIAM, projName, killTag);
  } catch (error) {
    console.error(`Unable to get list of cloudfront distributions: ${error.message}`);
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
      if (verbose) {
        console.log(`Disabling cloudfront distribution ${distId}`);
      }

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
            if (verbose) {
              console.log(`Cloudfront distribution ${distId} is disabled. Deleting.`);
            }

            // Get fresh ETag (it changes after disabling)
            try {
              const cloudFrontClient = createCloudFrontClient(useIAM);
              const configResponse = await cloudFrontClient.send(
                new GetDistributionConfigCommand({ Id: distId }),
              );

              ETag = configResponse.ETag;

              // Delete the distribution
              await cloudFrontClient.send(
                new DeleteDistributionCommand({ Id: distId, IfMatch: ETag }),
              );

              // Update awsResources.js
              updateAwsResourcesField("cloudFrontId", null); // TODO: maybe don't hardcode
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
                  console.error(`Unable to delete cloudfront distribution.`);
                  resolve(false);
                } else {
                  // Still in progress, continue waiting
                  resolve(true);
                }
              } catch {
                console.error(`Suddenly can't find cloudfront distribution ${distId}. Skipping...`);
                resolve(true);
              }
            }
          } else {
            const config = loadAwsConfig();
            const waitInterval = config.timeouts.cloudfront.checkInterval1000;
            if (verbose) {
              console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
            }
            setTimeout(waitAndDelete, waitInterval);
          }
        };

        if (verbose) {
          console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
        }
        waitAndDelete();
      });
    }),
  );
};

/**
 * (Helper)
 * Deletes an OAC with retry logic for in-use errors
 * WHY: AWS CloudFront backend has eventual consistency - even after distributions are
 * deleted, AWS may still report the OAC as "in use" for a short period. Retry attempts
 * and intervals are configurable in aws-deploy.yaml (defaults: 10 retries, 10s intervals)
 */
const deleteOACWithRetry = async (oacId, etag, useIAM, verbose = false) => {
  const config = loadAwsConfig();
  const { maxRetries, retryInterval } = config.timeouts.cloudfront.oacDeletion;
  const waitTime = retryInterval * 1000; // Convert s to ms

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const cloudFrontClient = createCloudFrontClient(useIAM);
      await cloudFrontClient.send(
        new DeleteOriginAccessControlCommand({ Id: oacId, IfMatch: etag }),
      );
      if (verbose && attempt > 0) {
        console.log(`✓ Successfully deleted OAC ${oacId} after ${attempt} retries`);
      }
      return; // Success
    } catch (error) {
      // If it's still in use and we have retries left, wait and retry
      if (error.name === "OriginAccessControlInUse" && attempt < maxRetries - 1) {
        console.log(
          `OAC ${oacId} still in use, waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Other error or final attempt - throw
      console.error(`Failed to delete origin access control ${oacId}: ${error.message}`);
      throw error;
    }
  }
};

/**
 * Delete all Origin Access Controls
 * WHY: OACs cannot be deleted while still referenced by CloudFront distributions. This
 * function enforces the correct deletion order: wait for distributions to be deleted
 * first, then wait additional time for AWS backend to fully release the references
 * (eventual consistency), then delete OACs with retry logic. Updates local state to
 * keep awsResources.js in sync
 * @param {string} useIAM - The IAM profile to use
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront distributions are deleted
 * @param {boolean} verbose - Whether to log detailed info about the deletion process
 * @returns {Promise<boolean>} True if successful
 */
const deleteOACs = async (useIAM, deletedCloudFront, verbose = false) => {
  // Wait for CloudFront distributions to be deleted
  await deletedCloudFront;

  // Wait for CloudFront to fully release OAC references on AWS backend
  const config = loadAwsConfig();
  const waitInterval = config.timeouts.cloudfront.checkInterval * 1000;
  if (verbose) {
    console.log(
      `Waiting ${waitInterval / 1000} seconds for CloudFront to fully release OAC references...`,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, waitInterval));

  // Get list of OACs
  let oacList;
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));
    oacList = response.OriginAccessControlList?.Items || [];
  } catch (error) {
    console.error(`Unable to get list of origin access controls: ${error.message}`);
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
      console.error(`Unable to get etag for origin access control ${oac.Id}: ${error.message}`);
      throw error;
    }

    // Delete with retry logic
    await deleteOACWithRetry(oac.Id, etag, useIAM, verbose);

    // Update awsResources.js
    if (verbose) {
      console.log(`Updating awsResources with cloudfront info`);
    }
    updateAwsResourcesField("OAC", null);
  }

  return true;
};

// Export functions
export { getOAC, waitForCloudFrontDeployment, deleteCloudFront, deleteOACs };
