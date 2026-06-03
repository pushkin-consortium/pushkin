/**
 * CloudFront Origin Access Control (OAC) operations.
 * OAC allows CloudFront to securely access the S3 bucket where the frontend is stored.
 * @module aws/services/cloudfront/oac
 */

import {
  CloudFrontClient,
  GetOriginAccessControlCommand,
  ListOriginAccessControlsCommand,
  CreateOriginAccessControlCommand,
  DeleteOriginAccessControlCommand,
} from "@aws-sdk/client-cloudfront";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { getAwsProfile } from "../../utils/aws-profile.js";
import { loadAwsConfig } from "../../utils/aws-config.js";
import { readAwsResources, updateAwsResourcesField } from "../../utils/aws-resources.js";
import { OriginAccessControl } from "../../awsConfigs.js";
import { AWS_REGION } from "../../constants.js";

function createCloudFrontClient() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(CloudFrontClient);
}

/**
 * Checks if an OAC resource still exists in AWS by ID.
 * WHY: Check if the OAC locally cached in awsResources.js is still valid.
 */
async function validateStoredOac(oacId) {
  try {
    const client = createCloudFrontClient();
    await client.send(new GetOriginAccessControlCommand({ Id: oacId }));
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
async function findOacByName(oacName) {
  const client = createCloudFrontClient();
  const response = await client.send(new ListOriginAccessControlsCommand({}));
  const existingOac = response.OriginAccessControlList?.Items?.find((oac) => oac.Name === oacName);
  return existingOac ? existingOac.Id : null;
}

/**
 * Creates a new OAC in AWS.
 * WHY: OACs are required for secure CloudFront-S3 access.
 */
async function createOac() {
  const client = createCloudFrontClient();
  const response = await client.send(
    new CreateOriginAccessControlCommand({ OriginAccessControlConfig: OriginAccessControl }),
  );
  return response.OriginAccessControl.Id;
}

/**
 * Gets or creates the Origin Access Control (OAC).
 * WHY: Implements idempotent OAC management with three fallback strategies:
 * 1. Use saved OAC ID if it exists in AWS
 * 2. Find existing OAC by name (recovery path if local state is stale)
 * 3. Create new OAC (no OAC at all – e.g. first deployment)
 * @param {boolean} verbose – Whether to log detailed info about the OAC retrieval/creation process
 * @returns {Promise<string>} The OAC ID
 */
async function getOac(verbose = false) {
  const awsResources = readAwsResources();
  if (verbose) console.log(`Retrieving Origin Access Control (OAC) for CloudFront...`);

  if (awsResources.OAC) {
    if (verbose) console.log(`Checking to see if OAC already exists.`);
    const exists = await validateStoredOac(awsResources.OAC);
    if (exists) return awsResources.OAC;
    if (verbose)
      console.log(`Saved OAC ID not found in AWS. Will search for updated ID on AWS by OAC name.`);
  }

  const existingOacId = await findOacByName(OriginAccessControl.Name);
  let oacId;
  if (existingOacId) {
    if (verbose)
      console.log(`Found existing OAC with name ${OriginAccessControl.Name}, reusing it.`);
    oacId = existingOacId;
  } else {
    if (verbose) console.log(`No OAC with name ${OriginAccessControl.Name}, creating new OAC.`);
    oacId = await createOac();
  }

  updateAwsResourcesField("OAC", oacId);
  return oacId;
}

/**
 * Deletes an OAC with retry logic for in-use errors.
 * WHY: AWS CloudFront backend has eventual consistency - even after distributions are
 * deleted, AWS may still report the OAC as "in use" for a short period.
 */
async function deleteOac(oacId, etag, verbose = false) {
  const config = loadAwsConfig();
  const { maxRetries, retryInterval } = config.timeouts.cloudfront.oacDeletion;
  const waitTime = retryInterval * 1000;
  const client = createCloudFrontClient();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await client.send(new DeleteOriginAccessControlCommand({ Id: oacId, IfMatch: etag }));
      if (verbose && attempt > 0)
        console.log(`✓ Successfully deleted OAC ${oacId} after ${attempt} retries`);
      return;
    } catch (error) {
      if (error.name === "OriginAccessControlInUse" && attempt < maxRetries - 1) {
        console.log(
          `OAC ${oacId} still in use, waiting ${retryInterval}s before retry ${attempt + 1}/${maxRetries}...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
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
 * (eventual consistency), then delete OACs with retry logic.
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront distributions are deleted
 * @param {boolean} verbose - Whether to log detailed info about the deletion process
 * @returns {Promise<boolean>} True if successful
 */
async function deleteOacs(deletedCloudFront, verbose = false) {
  // TODO: killize
  await deletedCloudFront;

  const config = loadAwsConfig();
  const waitInterval = config.timeouts.cloudfront.checkInterval * 1000;
  if (verbose)
    console.log(
      `Waiting ${waitInterval / 1000} seconds for CloudFront to fully release OAC references...`,
    );
  await new Promise((resolve) => setTimeout(resolve, waitInterval));

  const client = createCloudFrontClient();
  const listResponse = await client.send(new ListOriginAccessControlsCommand({}));
  const oacList = listResponse.OriginAccessControlList?.Items ?? [];

  if (oacList.length === 0) {
    console.log(`No origin access controls found. Skipping.`);
    return true;
  }

  for (const oac of oacList) {
    const oacResponse = await client.send(new GetOriginAccessControlCommand({ Id: oac.Id }));
    await deleteOac(oac.Id, oacResponse.ETag, verbose);
    if (verbose) console.log(`Updating awsResources with cloudfront info`);
    updateAwsResourcesField("OAC", null);
  }

  return true;
}

export { getOac, deleteOacs };
