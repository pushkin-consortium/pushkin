/**
 * Handles CloudFront distribution and Origin Access Control operations to serve Pushkin frontend securely.
 * CloudFront: AWS service that serves the Pushkin frontend to users.
 * Origin Access Control (OAC): Allows CloudFront to securely access the S3 bucket where the
 * frontend is stored.
 * @module cloudfront
 */

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
  waitUntilDistributionDeployed,
  GetDistributionConfigCommand,
  ListTagsForResourceCommand,
} from "@aws-sdk/client-cloudfront";
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { readAwsResources, updateAwsResourcesField } from "../utils/aws-resources.js";
import { OriginAccessControl } from "../awsConfigs.js";
import { AWS_REGION } from "../constants.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

const createCloudFrontClient = (useIAM) =>
  new AWSClientFactory(AWS_REGION, useIAM).createClient(CloudFrontClient);

/**
 * Checks if an OAC resource still exists in AWS by ID.
 * WHY: Check if the OAC locally cached in awsResources.js is still valid.
 */
async function validateStoredOAC(oacId, useIAM) {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    await cloudFrontClient.send(new GetOriginAccessControlCommand({ Id: oacId }));
    return true;
  } catch (error) {
    if (error.name === "NoSuchOriginAccessControl") {
      console.warn(`OAC with ID ${oacId} not found in AWS. It may have been deleted:`, error);
    } else {
      console.error(`Error validating OAC with ID ${oacId}:`, error);
      throw error;
    }
    return false;
  }
}

/**
 * Finds an existing OAC resource by name.
 * WHY: Prevent creating duplicate OACs when redeploying, as they are reusable across deployments.
 * Mostly acts as a fallback if validateStoredOAC returns false (i.e. local state lost) but the OAC
 * still exists in AWS.
 */
async function findOACByName(oacName, useIAM) {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));

    const existingOAC = response.OriginAccessControlList?.Items?.find(
      (oac) => oac.Name === oacName,
    );

    return existingOAC ? existingOAC.Id : null;
  } catch (error) {
    console.error(`Unable to list origin access controls:`, error);
    throw error;
  }
}

/**
 * Creates a new OAC (Origin Access Control) in AWS if no existing OAC.
 * WHY: OACs are required for secure CloudFront-S3 access.
 */
async function createOAC(useIAM) {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(
      new CreateOriginAccessControlCommand({
        OriginAccessControlConfig: OriginAccessControl,
      }),
    );
    return response.OriginAccessControl.Id;
  } catch (error) {
    console.error(`Unable to create Origin Access Control:`, error);
    throw error;
  }
}

/**
 * Gets or creates the Origin Access Control (OAC).
 * WHY: Implements idempotent OAC management with three fallback strategies:
 * 1. Use saved OAC ID if it exists in AWS
 * 2. Find existing OAC by name (recovery path if local state is stale)
 * 3. Create new OAC (no OAC at all – e.g. first deployment)
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose – Whether to log detailed info about the OAC retrieval/creation process
 * @returns {Promise<string>} The OAC ID
 * @throws Will throw an error downstream if finding OAC by name or ID, or creating a new one, fails
 */
async function getOAC(useIAM, verbose = false) {
  const awsResources = readAwsResources();
  if (verbose) {
    console.log(`Retrieving Origin Access Control (OAC) for CloudFront...`);
  }

  // Check if we have a saved OAC ID and if it still exists in AWS
  if (verbose) {
    console.log(`Checking to see if OAC already exists.`);
  }
  if (awsResources.OAC) {
    const exists = await validateStoredOAC(awsResources.OAC, useIAM);
    if (exists) {
      return awsResources.OAC;
    }
    if (verbose) {
      console.log(`Saved OAC ID not found in AWS. Will search for updated ID on AWS by OAC name.`);
    }
  }

  // Try to find an existing OAC with our cached name
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
}

/**
 * Waits for CloudFront distribution to be fully deployed.
 * WHY: So we don't try to access site or make changes before it's ready, which will fail.
 * @param {string} distributionId - The CloudFront distribution ID
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose - Whether to log detailed info about the deployment status checks
 * @returns {Promise<void>} – Resolves when the distribution is deployed
 */
async function waitForCloudFrontDeployment(distributionId, useIAM, verbose = false) {
  const config = loadAwsConfig();
  const cloudFrontClient = createCloudFrontClient(useIAM);
  const cloudfrontTimeouts = config.timeouts.cloudfront;

  console.log(`\nWaiting for CloudFront distribution to be fully deployed...`);
  if (verbose) {
    console.log(
      `This can take 5-20 minutes. Timeout set to ${cloudfrontTimeouts.maxWaitTime / 60} minutes.`,
    );
  }

  try {
    await waitUntilDistributionDeployed(
      {
        client: cloudFrontClient,
        maxWaitTime: cloudfrontTimeouts.maxWaitTime,
      },
      { Id: distributionId },
    );
    console.log(`\n✓ CloudFront distribution is now fully deployed and ready!`);
  } catch {
    console.log(
      `\nCloudFront distribution is still deploying after ${cloudfrontTimeouts.maxWaitTime / 60} minutes.`,
    );
    console.log(`Your site may not be immediately accessible. Check the status with:`);
    console.log(`  pushkin aws status`);
  }
}

/**
 * Gets the tags for a CloudFront distribution by ARN.
 * WHY: Used to check if a distribution is tagged for this project, which helps prevent
 * accidentally deleting distributions from other projects in shared AWS accounts.
 */
async function getDistributionTags(arn, useIAM) {
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const response = await cloudFrontClient.send(new ListTagsForResourceCommand({ Resource: arn }));
    return response.Tags?.Items ?? [];
  } catch (error) {
    console.error(`Unable to get tags for distribution ${arn}:`, error);
    throw error;
  }
}

/**
 * Verifies a distribution belongs to the current Pushkin project.
 * WHY: This prevents accidentally deleting distributions from other projects or non-Pushkin
 * resources in shared AWS accounts.
 */
async function isDistributionTaggedForProject(distribution, projName, useIAM) {
  const tags = await getDistributionTags(distribution.ARN, useIAM);
  return tags.some((tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === projName);
}

/**
 * Gets list of distribution IDs to delete.
 * WHY: Supports two deletion modes: targeted (project-specific) and total (all distributions)
 * The killTag parameter determines behavior - when true, only deletes distributions tagged
 * for this project (safe for shared accounts); when false, deletes all (for cleanup/testing).
 */
async function getDistributionIdsToDelete(useIAM, projName, killTag) {
  const cloudFrontClient = createCloudFrontClient(useIAM);
  const response = await cloudFrontClient.send(new ListDistributionsCommand({}));

  const items = response.DistributionList?.Items ?? [];
  if (items.length === 0) {
    return [];
  }

  if (!killTag) {
    // TODO: killize
    // Delete all distributions
    return items.map((d) => d.Id);
  } else {
    const distributionIds = [];

    // Filter by project tag
    if (!projName) {
      throw new Error("Project name is missing but required to delete tagged distributions.");
    }

    for (const distribution of items) {
      if (await isDistributionTaggedForProject(distribution, projName, useIAM)) {
        distributionIds.push(distribution.Id);
      }
    }

    return distributionIds;
  }
}

/**
 * Delete the CloudFront distribution(s) associated with this project (or all distributions if killTag is false).
 * WHY: Orchestrates the complete CloudFront deletion workflow which must follow AWS's
 * required sequence: get config → disable → wait for disable to propagate → get fresh
 * ETag → delete. The ETag must be refreshed after disabling because AWS updates it when
 * the configuration changes. Handles multiple distributions in parallel for efficiency.
 * @param {string} useIAM – The IAM profile to use
 * @param {string} projName – The Pushkin project name
 * @param {string|null} killTag – Project name to filter by; if null/falsy, deletes all distributions
 * @param {boolean} verbose – Whether to log detailed info about the deletion process
 * @returns {Promise<boolean>} – Resolves true if deletion process initiated successfully, false if there was a problem
 */
async function deleteCloudFrontDistribution(useIAM, projName, killTag, verbose = false) {
  let distributions;
  try {
    distributions = await getDistributionIdsToDelete(useIAM, projName, killTag);
  } catch (error) {
    console.error(`Unable to get list of cloudfront distributions:`, error);
    throw error;
  }

  if (distributions.length === 0) {
    console.log(`No cloudfront distributions found. Skipping.`);
    return true;
  }

  // Disable and delete each distribution
  const results = await Promise.all(
    distributions.map(async (distId) => {
      const cloudFrontClient = createCloudFrontClient(useIAM);
      let cloudConfig;
      let ETag;
      try {
        const response = await cloudFrontClient.send(
          new GetDistributionConfigCommand({ Id: distId }),
        );
        cloudConfig = response.DistributionConfig;
        ETag = response.ETag;
      } catch (error) {
        console.warn(`Cannot find cloudfront distribution ${distId}`, error);
        console.warn(`May have already been deleted. Skipping.`);
        return true;
      }

      cloudConfig.Enabled = false;
      if (verbose) {
        console.log(`Disabling cloudfront distribution ${distId}`);
      }

      try {
        await cloudFrontClient.send(
          new UpdateDistributionCommand({
            Id: distId,
            IfMatch: ETag,
            DistributionConfig: cloudConfig,
          }),
        );
      } catch (error) {
        console.error(
          `Unable to disable cloudfront distribution ${distId}.\n Sometimes this throws errors but works anyway, so we'll continue and see what happens...\n`,
          error,
        );
      }

      // Wait for distribution to be disabled, then delete it
      if (verbose) {
        console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
      }
      const cloudfrontTimeouts = loadAwsConfig().timeouts.cloudfront;
      await createWaiter(
        {
          client: cloudFrontClient,
          maxWaitTime: cloudfrontTimeouts.maxWaitTime,
          minDelay: cloudfrontTimeouts.checkInterval,
          maxDelay: cloudfrontTimeouts.checkInterval,
        },
        { Id: distId },
        async (client, input) => {
          try {
            const response = await client.send(new GetDistributionCommand(input));
            const ready =
              response.Distribution.DistributionConfig.Enabled === false &&
              response.Distribution.Status !== "InProgress";
            if (ready) return { state: WaiterState.SUCCESS };
            if (verbose) {
              console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
            }
            return { state: WaiterState.RETRY };
          } catch (error) {
            if (error.name === "NoSuchDistribution") return { state: WaiterState.SUCCESS };
            throw error;
          }
        },
      );

      if (verbose) {
        console.log(`Cloudfront distribution ${distId} is disabled. Deleting.`);
      }

      // Get fresh ETag (it changes after disabling) and delete
      try {
        const configResponse = await cloudFrontClient.send(
          new GetDistributionConfigCommand({ Id: distId }),
        );
        ETag = configResponse.ETag;
        await cloudFrontClient.send(new DeleteDistributionCommand({ Id: distId, IfMatch: ETag }));
        updateAwsResourcesField("cloudFrontId", null); // TODO: maybe don't hardcode
      } catch (error) {
        console.error(`Error during CloudFront deletion:`, error);

        // Check if distribution is still in progress
        try {
          const distResponse = await cloudFrontClient.send(
            new GetDistributionCommand({ Id: distId }),
          );
          if (distResponse.Distribution.Status !== "InProgress") {
            console.error(`Unable to delete cloudfront distribution.`);
            return false;
          }
          return true;
        } catch {
          console.error(`Suddenly can't find cloudfront distribution ${distId}. Skipping...`);
          return true;
        }
      }
      return true;
    }),
  );
  return results.every(Boolean);
}

/**
 * Deletes an OAC with retry logic for in-use errors.
 * WHY: AWS CloudFront backend has eventual consistency - even after distributions are
 * deleted, AWS may still report the OAC as "in use" for a short period. Retry attempts
 * and intervals are configurable in aws-deploy.yaml (defaults: 10 retries, 10s intervals).
 */
async function deleteOAC(oacId, etag, useIAM, verbose = false) {
  const config = loadAwsConfig();
  const oacDeletionTimeouts = config.timeouts.cloudfront.oacDeletion;
  const waitTime = oacDeletionTimeouts.retryInterval * 1000; // Convert s to ms
  const cloudFrontClient = createCloudFrontClient(useIAM);

  for (let attempt = 0; attempt < oacDeletionTimeouts.maxRetries; attempt++) {
    try {
      await cloudFrontClient.send(
        new DeleteOriginAccessControlCommand({ Id: oacId, IfMatch: etag }),
      );
      if (verbose && attempt > 0) {
        console.log(`✓ Successfully deleted OAC ${oacId} after ${attempt} retries`);
      }
      return; // Success
    } catch (error) {
      // If it's still in use and we have retries left, wait and retry
      if (
        error.name === "OriginAccessControlInUse" &&
        attempt < oacDeletionTimeouts.maxRetries - 1
      ) {
        console.log(
          `OAC ${oacId} still in use, waiting ${waitTime / 1000}s before retry ${attempt + 1}/${oacDeletionTimeouts.maxRetries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Other error or final attempt - throw
      console.error(`Failed to delete origin access control ${oacId}:`, error);
      throw error;
    }
  }
}

/**
 * Delete all Origin Access Controls.
 * WHY: OACs cannot be deleted while still referenced by CloudFront distributions. This
 * function enforces the correct deletion order: wait for distributions to be deleted
 * first, then wait additional time for AWS backend to fully release the references
 * (eventual consistency), then delete OACs with retry logic. Updates local state to
 * keep awsResources.js in sync.
 * @param {string} useIAM - The IAM profile to use
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront distributions are deleted
 * @param {boolean} verbose - Whether to log detailed info about the deletion process
 * @returns {Promise<boolean>} True if successful
 */
async function deleteOACs(useIAM, deletedCloudFront, verbose = false) {
  // TODO: killize
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
    oacList = response.OriginAccessControlList?.Items ?? [];
  } catch (error) {
    console.error(`Unable to get list of origin access controls:`, error);
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
      console.error(`Unable to get etag for origin access control ${oac.Id}:`, error);
      throw error;
    }

    // Delete with retry logic
    await deleteOAC(oac.Id, etag, useIAM, verbose);

    // Update awsResources.js
    if (verbose) {
      console.log(`Updating awsResources with cloudfront info`);
    }
    updateAwsResourcesField("OAC", null);
  }

  return true;
}

export { getOAC, waitForCloudFrontDeployment, deleteCloudFrontDistribution, deleteOACs };
