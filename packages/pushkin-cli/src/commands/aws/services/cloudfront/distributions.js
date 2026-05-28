/**
 * CloudFront distribution operations.
 * Handles creating, updating, and deleting CloudFront distributions for Pushkin sites.
 * @module aws/services/cloudfront/distributions
 */

import {
  CloudFrontClient,
  GetDistributionCommand,
  ListDistributionsCommand,
  CreateDistributionWithTagsCommand,
  CreateInvalidationCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  waitUntilDistributionDeployed,
  GetDistributionConfigCommand,
  ListTagsForResourceCommand,
} from "@aws-sdk/client-cloudfront";
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../utils/aws-profile.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { updateAwsResourcesField } from "../utils/aws-resources.js";
import { cloudFront } from "../awsConfigs.js";
import { AWS_REGION, PROJECT_TAG_KEY } from "../constants.js";

function createCloudFrontClient() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(CloudFrontClient);
}

/**
 * Waits for CloudFront distribution to be fully deployed.
 * WHY: So we don't try to access site or make changes before it's ready, which will fail.
 * @param {string} distributionId - The CloudFront distribution ID
 * @param {boolean} verbose - Whether to log detailed info about the deployment status checks
 * @returns {Promise<void>} – Resolves when the distribution is deployed
 */
async function waitForCloudFrontDeployment(distributionId, verbose = false) {
  const config = loadAwsConfig();
  const client = createCloudFrontClient();
  const { maxWaitTime } = config.timeouts.cloudfront;

  console.log(`\nWaiting for CloudFront distribution to be fully deployed...`);
  if (verbose)
    console.log(`This can take 5-20 minutes. Timeout set to ${maxWaitTime / 60} minutes.`);

  try {
    await waitUntilDistributionDeployed({ client, maxWaitTime }, { Id: distributionId });
    console.log(`\n✓ CloudFront distribution is now fully deployed and ready!`);
  } catch {
    console.log(`\nCloudFront distribution is still deploying after ${maxWaitTime / 60} minutes.`);
    console.log(`Your site may not be immediately accessible. Check the status with:`);
    console.log(`  pushkin aws status`);
  }
}

/**
 * Ensure a CloudFront distribution exists for the given S3 bucket, creating one if needed.
 * If a distribution already exists (identified by S3 bucket as origin ID), fires a cache
 * invalidation and returns it. Otherwise creates a new distribution with the given config.
 * @param {object} options
 * @param {string} options.s3BucketName - S3 bucket name (used as origin ID)
 * @param {string} options.projectName - Pushkin project name (used for tagging)
 * @param {string|null} options.domainName - Custom domain name, or null for auto-generated URL
 * @param {string} options.sslCertificate - ACM certificate ARN (required if domainName is set)
 * @param {string} options.oacId - Origin Access Control ID
 * @param {string} options.webAclArn - WAF Web ACL ARN
 * @returns {Promise<object>} The CloudFront distribution object
 */
async function ensureDistribution({ s3BucketName, projectName, domainName, sslCertificate, oacId, webAclArn }) {
  const client = createCloudFrontClient();
  const { DistributionList } = await client.send(new ListDistributionsCommand({}));

  let targetDistribution;
  for (const distribution of DistributionList?.Items ?? []) {
    let originId;
    try {
      originId = distribution.Origins.Items[0].Id;
    } catch {
      console.warn(`Found an incompletely-specified CloudFront distribution. This may not be a problem, but you should check.`);
      continue;
    }
    if (originId === s3BucketName) {
      targetDistribution = distribution;
      console.log(
        `Distribution for ${s3BucketName} found. Updating files. Note that if you do this more than 1000x/month, you'll start incurring extra charges.`,
      );
      // Fire-and-forget invalidation — intentionally not awaited
      client.send(
        new CreateInvalidationCommand({
          DistributionId: distribution.Id,
          InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: { Quantity: 1, Items: ["/*"] },
          },
        }),
      );
      break;
    }
  }

  if (!targetDistribution) {
    console.log(`No existing CloudFront distribution for ${s3BucketName}. Creating distribution.`);
    const myCloudFront = structuredClone(cloudFront);
    myCloudFront.DistributionConfig.Origins.Items[0].OriginAccessControlId = oacId;
    myCloudFront.DistributionConfig.WebACLId = webAclArn;
    myCloudFront.DistributionConfig.CallerReference = s3BucketName;
    myCloudFront.DistributionConfig.DefaultCacheBehavior.TargetOriginId = s3BucketName;
    myCloudFront.DistributionConfig.Origins.Items[0].Id = s3BucketName;
    myCloudFront.DistributionConfig.Origins.Items[0].DomainName = `${s3BucketName}.s3.amazonaws.com`;
    myCloudFront.Tags.Items[0].Value = projectName;

    if (domainName) {
      const isSubdomain = domainName.split(".").length > 2;
      if (isSubdomain) {
        myCloudFront.DistributionConfig.Aliases.Quantity = 1;
        myCloudFront.DistributionConfig.Aliases.Items = [domainName];
      } else {
        myCloudFront.DistributionConfig.Aliases.Quantity = 2;
        myCloudFront.DistributionConfig.Aliases.Items = [domainName, `www.${domainName}`];
      }
      myCloudFront.DistributionConfig.ViewerCertificate.CloudFrontDefaultCertificate = false;
      myCloudFront.DistributionConfig.ViewerCertificate.ACMCertificateArn = sslCertificate;
      myCloudFront.DistributionConfig.ViewerCertificate.SSLSupportMethod = "sni-only";
      myCloudFront.DistributionConfig.ViewerCertificate.MinimumProtocolVersion = "TLSv1.2_2019";
    }

    const created = await client.send(
      new CreateDistributionWithTagsCommand({
        DistributionConfigWithTags: {
          DistributionConfig: myCloudFront.DistributionConfig,
          Tags: { Items: myCloudFront.Tags.Items },
        },
      }),
    );
    targetDistribution = created.Distribution;
    updateAwsResourcesField("cloudFrontId", targetDistribution.Id);
  }

  return targetDistribution;
}

/**
 * Verifies a distribution belongs to the current Pushkin project.
 * WHY: Prevents accidentally deleting distributions from other projects or non-Pushkin
 * resources in shared AWS accounts.
 */
async function isDistributionTaggedForProject(distribution, projectName) {
  const client = createCloudFrontClient();
  const tags = await client.send(new ListTagsForResourceCommand({ Resource: distribution.ARN }));
  return tags.Tags?.Items?.some((tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === projectName);
}

/**
 * Gets list of distribution IDs to delete.
 * WHY: Supports two deletion modes: targeted (project-specific) and total (all distributions).
 */
async function getDistributionIdsToDelete(projectName, killTag) {
  const client = createCloudFrontClient();
  const response = await client.send(new ListDistributionsCommand({}));
  const items = response.DistributionList?.Items ?? [];

  if (items.length === 0) return [];

  if (!killTag) {
    // TODO: killize
    return items.map((d) => d.Id);
  }

  if (!projectName) throw new Error("Project name is required to delete tagged distributions.");

  const distributionIds = [];
  for (const distribution of items) {
    if (await isDistributionTaggedForProject(distribution, projectName)) {
      distributionIds.push(distribution.Id);
    }
  }
  return distributionIds;
}

/**
 * Delete the CloudFront distribution(s) associated with this project (or all if killTag is false).
 * WHY: Orchestrates the complete CloudFront deletion workflow which must follow AWS's
 * required sequence: get config → disable → wait for disable to propagate → get fresh
 * ETag → delete. The ETag must be refreshed after disabling because AWS updates it when
 * the configuration changes.
 * @param {string} projectName – The Pushkin project name
 * @param {string|null} killTag – Project name to filter by; if null/falsy, deletes all distributions
 * @param {boolean} verbose – Whether to log detailed info about the deletion process
 * @returns {Promise<boolean>} – Resolves true if deletion process initiated successfully
 */
async function deleteCloudFrontDistribution(projectName, killTag, verbose = false) {
  const distributions = await getDistributionIdsToDelete(projectName, killTag);

  if (distributions.length === 0) {
    console.log(`No cloudfront distributions found. Skipping.`);
    return true;
  }

  const results = await Promise.all(
    distributions.map(async (distId) => {
      const client = createCloudFrontClient();
      let cloudConfig, ETag;

      try {
        const response = await client.send(new GetDistributionConfigCommand({ Id: distId }));
        cloudConfig = response.DistributionConfig;
        ETag = response.ETag;
      } catch (error) {
        console.warn(`Cannot find cloudfront distribution ${distId}:`, error);
        console.warn(`May have already been deleted. Skipping.`);
        return true;
      }

      cloudConfig.Enabled = false;
      if (verbose) console.log(`Disabling cloudfront distribution ${distId}`);

      await client.send(
        new UpdateDistributionCommand({ Id: distId, IfMatch: ETag, DistributionConfig: cloudConfig }),
      );

      if (verbose) console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
      const { maxWaitTime, checkInterval } = loadAwsConfig().timeouts.cloudfront;
      await createWaiter(
        { client, maxWaitTime, minDelay: checkInterval, maxDelay: checkInterval },
        { Id: distId },
        async (c, input) => {
          try {
            const response = await c.send(new GetDistributionCommand(input));
            const ready =
              response.Distribution.DistributionConfig.Enabled === false &&
              response.Distribution.Status !== "InProgress";
            if (ready) return { state: WaiterState.SUCCESS };
            if (verbose) console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
            return { state: WaiterState.RETRY };
          } catch (error) {
            if (error.name === "NoSuchDistribution") return { state: WaiterState.SUCCESS };
            throw error;
          }
        },
      );

      if (verbose) console.log(`Cloudfront distribution ${distId} is disabled. Deleting.`);

      try {
        const configResponse = await client.send(new GetDistributionConfigCommand({ Id: distId }));
        ETag = configResponse.ETag;
        await client.send(new DeleteDistributionCommand({ Id: distId, IfMatch: ETag }));
        updateAwsResourcesField("cloudFrontId", null); // TODO: maybe don't hardcode
      } catch (error) {
        console.error(`Error during CloudFront deletion:`, error);
        try {
          const distResponse = await client.send(new GetDistributionCommand({ Id: distId }));
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

export { ensureDistribution, waitForCloudFrontDeployment, deleteCloudFrontDistribution };
