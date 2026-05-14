/**
 * Frontend Deployment Phase
 * Deploys the built React front-end to S3 and CloudFront
 * @module aws/phases/init
 */

import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  ListDistributionsCommand,
  CreateInvalidationCommand,
  CreateDistributionWithTagsCommand,
} from "@aws-sdk/client-cloudfront";
import { getOAC, waitForCloudFrontDeployment } from "../services/cloudfront.js";
import { getACL } from "../services/security.js";
import { syncS3 } from "../services/s3.js";
import { makeRecordSet } from "../services/route53.js";
import { cloudFront, policy } from "../awsConfigs.js";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../utils/aws-resources.js";
import { AWS_REGION } from "../constants.js";

/**
 * Deploy the front-end to S3 and CloudFront.
 * Creates an S3 bucket (private), a CloudFront distribution backed by that bucket
 * via an OAC, sets the bucket policy, and creates Route53 DNS records if a custom
 * domain is configured.
 * @param {string} projName - The Pushkin project name
 * @param {string} s3BucketName - The S3 bucket name (sanitized, globally unique, AWS-compliant)
 * @param {string} useIAM - The IAM profile to use
 * @param {string} domainName - The domain name ("default" to skip custom domain setup)
 * @param {string} myCertificate - The ACM certificate ARN
 * @param {Promise} builtFrontEnd - Promise that resolves when the front-end build is complete
 * @returns {Promise<string>} The CloudFront domain name for the deployed front-end
 */
const deployFrontEnd = async (
  projName,
  s3BucketName,
  useIAM,
  domainName,
  myCertificate,
  builtFrontEnd,
) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const s3 = factory.createClient(S3Client);
  const cloudFrontClient = factory.createClient(CloudFrontClient);

  // Check if S3 bucket already exists
  console.log(`Checking to see if bucket ${s3BucketName} already exists.`);
  let bucketExists = false;
  try {
    const response = await s3.send(new ListBucketsCommand({}));
    bucketExists = response.Buckets.some((bucket) => bucket.Name === s3BucketName);
    if (bucketExists) console.log(`Bucket exists. Skipping create.`);
  } catch (error) {
    console.error(`Problem listing aws s3 buckets for your account:`, error);
    throw error;
  }

  // Start OAC and ACL creation in parallel (both may take time)
  const OAC = getOAC(useIAM);
  const ACLarn = getACL(useIAM);

  if (!bucketExists) {
    console.log("Bucket does not yet exist. Creating s3 bucket");
    try {
      await s3.send(new CreateBucketCommand({ Bucket: s3BucketName }));
    } catch (e) {
      console.error("Problem creating bucket for front-end");
      throw e;
    }
  }

  // Kick off S3 sync in parallel (waits on builtFrontEnd internally)
  await builtFrontEnd;
  const syncMe = syncS3(s3BucketName, useIAM);

  // Check for existing CloudFront distribution
  console.log(`Checking for CloudFront distribution`);
  let distributions;
  try {
    distributions = await cloudFrontClient.send(new ListDistributionsCommand({}));
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`);
    throw e;
  }

  let theCloud;
  const items = distributions.DistributionList?.Items ?? [];
  for (const d of items) {
    let originId;
    try {
      originId = d.Origins.Items[0].Id;
    } catch {
      console.warn(
        `Found an incompletely-specified CloudFront distribution. This may not be a problem, but you should check.`,
      );
      console.warn(`Worst-case scenario, run 'pushkin aws armageddon' and start over.`);
      continue;
    }
    if (originId === s3BucketName) {
      theCloud = d;
      console.log(
        `Distribution for ${s3BucketName} found. Updating files. Note that if you do this more than 1000x/month, you'll start incurring extra charges.`,
      );
      // Fire-and-forget invalidation — intentionally not awaited
      cloudFrontClient.send(
        new CreateInvalidationCommand({
          DistributionId: d.Id,
          InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: { Quantity: 1, Items: ["/*"] },
          },
        }),
      );
      break;
    }
  }

  if (!theCloud) {
    console.log(`No existing CloudFront distribution for ${s3BucketName}. Creating distribution.`);
    const myCloudFront = structuredClone(cloudFront);
    myCloudFront.DistributionConfig.Origins.Items[0].OriginAccessControlId = await OAC;
    myCloudFront.DistributionConfig.WebACLId = await ACLarn;
    myCloudFront.DistributionConfig.CallerReference = s3BucketName;
    myCloudFront.DistributionConfig.DefaultCacheBehavior.TargetOriginId = s3BucketName;
    myCloudFront.DistributionConfig.Origins.Items[0].Id = s3BucketName;
    myCloudFront.DistributionConfig.Origins.Items[0].DomainName =
      `${s3BucketName}.s3.amazonaws.com`;
    myCloudFront.Tags.Items[0].Value = projName;

    if (domainName !== "default") {
      const domainParts = domainName.split(".");
      const isSubdomain = domainParts.length > 2;

      if (isSubdomain) {
        myCloudFront.DistributionConfig.Aliases.Quantity = 1;
        myCloudFront.DistributionConfig.Aliases.Items = [domainName];
      } else {
        myCloudFront.DistributionConfig.Aliases.Quantity = 2;
        myCloudFront.DistributionConfig.Aliases.Items = [domainName, `www.${domainName}`];
      }

      myCloudFront.DistributionConfig.ViewerCertificate.CloudFrontDefaultCertificate = false;
      myCloudFront.DistributionConfig.ViewerCertificate.ACMCertificateArn = myCertificate;
      myCloudFront.DistributionConfig.ViewerCertificate.SSLSupportMethod = "sni-only";
      myCloudFront.DistributionConfig.ViewerCertificate.MinimumProtocolVersion = "TLSv1.2_2019";
    }

    try {
      const created = await cloudFrontClient.send(
        new CreateDistributionWithTagsCommand({
          DistributionConfigWithTags: {
            DistributionConfig: myCloudFront.DistributionConfig,
            Tags: { Items: myCloudFront.Tags.Items },
          },
        }),
      );
      theCloud = created.Distribution;
    } catch (e) {
      console.error("Could not set up CloudFront.");
      throw e;
    }

    try {
      updateAwsResourcesField("cloudFrontId", theCloud.Id);
    } catch (e) {
      console.error(`Unable to update awsResources.js`);
      console.error(e);
    }
  }

  // Set bucket policy to allow only CloudFront (via OAC)
  console.log("Setting bucket permissions");
  policy.Statement[0].Resource = `arn:aws:s3:::${s3BucketName}/*`;
  policy.Statement[0].Condition.StringEquals["AWS:SourceArn"] = theCloud.ARN;
  try {
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: s3BucketName,
        Policy: JSON.stringify(policy),
      }),
    );
    console.log("Bucket permissions set successfully");
  } catch (e) {
    console.error("Problem setting bucket permissions for front-end");
    throw e;
  }

  if (domainName !== "default") {
    try {
      await makeRecordSet(domainName, projName, useIAM, theCloud);
    } catch (e) {
      console.error(`Unable to create or update record set for ${domainName}`);
      throw e;
    }
  }

  await syncMe;
  console.log(`Finished syncing files`);

  await waitForCloudFrontDeployment(theCloud.Id, useIAM);

  return theCloud.DomainName;
};

export { deployFrontEnd };
