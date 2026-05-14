// Import statements needed for this module
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
import { getOAC, getACL, syncS3, waitForCloudFrontDeployment } from "./cloudfront.js";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../utils/aws-resources.js";
import { AWS_REGION } from "../constants.js";

/**
 * Deploys the front-end to S3 and CloudFront
 * @param {string} projName - The Pushkin project name
 * @param {string} s3BucketName - The S3 bucket name (sanitized, globally unique, AWS-compliant)
 * @param {string} useIAM - The IAM role to use
 * @param {string} domainName - The domain name
 * @param {string} myCertificate - The SSL certificate
 * @param {string} builtFrontEnd - The built front-end assets
 * @returns {string} - The CloudFront domain name for the deployed front-end
 */

// Create S3 bucket (keep it private)
// Create CloudFront distribution
// Configure OAC
// Attach bucket policy allowing only CloudFront (via OAC)
const deployFrontEnd = async (
  projName,
  s3BucketName,
  useIAM,
  domainName,
  myCertificate,
  builtFrontEnd,
) => {
  const profileName = useIAM;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const s3 = factory.createClient(S3Client);
  console.log(`Checking to see if bucket ${s3BucketName} already exists.`);
  let bucketExists = false;
  try {
    const listBucketsCommand = new ListBucketsCommand({});
    const response = await s3.send(listBucketsCommand);
    response.Buckets.forEach((b) => {
      if (b.Name == s3BucketName) {
        bucketExists = true;
        console.log(`Bucket exists. Skipping create.`);
      }
    });
  } catch (e) {
    console.error(`Problem listing aws s3 buckets for your account`);
    throw e;
  }

  let OAC = getOAC(useIAM); //this will create if necessary. Returns OAC as promise.
  let ACLarn = getACL(useIAM); //this will create if necessary. Returns ACLID as promise.

  if (!bucketExists) {
    console.log("Bucket does not yet exist. Creating s3 bucket");
    try {
      const response = await s3.send(new CreateBucketCommand({ Bucket: s3BucketName }));
    } catch (e) {
      console.error("Problem creating bucket for front-end");
      throw e;
    }
  }

  await builtFrontEnd; //need this before we sync!
  let syncMe;
  try {
    syncMe = syncS3(s3BucketName, useIAM);
  } catch (e) {
    console.error(`Unable to sync local build with s3 bucket`);
    throw e;
  }

  let myCloud, theCloud;
  console.log(`Checking for CloudFront distribution`);
  let distributions;
  let distributionExists = false;
  const cloudFrontClient = factory.createClient(CloudFrontClient);
  try {
    distributions = await cloudFrontClient.send(new ListDistributionsCommand({}));
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`);
    throw e;
  }
  if (distributions.DistributionList.Items && distributions.DistributionList.Items.length > 0) {
    distributions.DistributionList.Items.forEach((d) => {
      let tempCheck = false;
      try {
        tempCheck = d.Origins.Items[0].Id == s3BucketName;
      } catch (e) {
        //eslint-disable-line
        // Probably not a fully created cloudfront distribution.
        // Probably can ignore this.
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Found an incompletely-specified cloudFront distribution. This may not be a problem, but you should check.`,
        );
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Worst-case scenario, run 'pushkin aws armageddon' and start over.`,
        );
      }
      if (tempCheck) {
        distributionExists = true;
        theCloud = d;
        console.log(
          `Distribution for ${s3BucketName} found. Updating files. Note that if you do this more than 1000x/month, you'll start incurring extra charges.`,
        );
        //because the next step is only sometimes run, and because it is very fast, it was simpler to do an 'await' then do asynchronously
        try {
          cloudFrontClient.send(
            new CreateInvalidationCommand({
              DistributionId: d.Id,
              InvalidationBatch: {
                CallerReference: Date.now().toString(),
                Paths: {
                  Quantity: 1,
                  Items: ["/*"],
                },
              },
            }),
          );
        } catch (e) {
          console.error(`Unable to update cloudfront cache`);
          throw e;
        }
      }
    });
  }

  if (!distributionExists) {
    console.log(`No existing cloudFront distribution for ${s3BucketName}. Creating distribution.`);
    const myCloudFront = structuredClone(cloudFront);
    myCloudFront.DistributionConfig.Origins.Items[0].OriginAccessControlId = await OAC; //we'll need this before continuing.
    myCloudFront.DistributionConfig.WebACLId = await ACLarn; //we'll need this before continuing.
    myCloudFront.DistributionConfig.CallerReference = s3BucketName;
    myCloudFront.DistributionConfig.DefaultCacheBehavior.TargetOriginId = s3BucketName;
    myCloudFront.DistributionConfig.Origins.Items[0].Id = s3BucketName;
    myCloudFront.DistributionConfig.Origins.Items[0].DomainName =
      s3BucketName.concat(".s3.amazonaws.com");
    myCloudFront.Tags.Items[0].Value = projName;
    if (domainName != "default") {
      // set up DNS
      // Check if domain is already a subdomain (contains a dot before the TLD)
      const domainParts = domainName.split(".");
      const isSubdomain = domainParts.length > 2;

      if (isSubdomain) {
        // For subdomains like "gww.cherriechang.com", only use the subdomain itself
        myCloudFront.DistributionConfig.Aliases.Quantity = 1;
        myCloudFront.DistributionConfig.Aliases.Items = [domainName];
      } else {
        // For root domains like "cherriechang.com", add both root and www
        myCloudFront.DistributionConfig.Aliases.Quantity = 2;
        myCloudFront.DistributionConfig.Aliases.Items = [domainName, "www.".concat(domainName)];
      }

      myCloudFront.DistributionConfig.ViewerCertificate.CloudFrontDefaultCertificate = false;
      myCloudFront.DistributionConfig.ViewerCertificate.ACMCertificateArn = myCertificate;
      myCloudFront.DistributionConfig.ViewerCertificate.SSLSupportMethod = "sni-only";
      myCloudFront.DistributionConfig.ViewerCertificate.MinimumProtocolVersion = "TLSv1.2_2019";
    }
    try {
      myCloud = await cloudFrontClient.send(
        new CreateDistributionWithTagsCommand({
          DistributionConfigWithTags: {
            credentials: useIAM.iam,
            DistributionConfig: myCloudFront.DistributionConfig,
            Tags: {
              Items: myCloudFront.Tags.Items,
            },
          },
        }),
      );
      theCloud = myCloud.Distribution;
    } catch (e) {
      console.log("Could not set up cloudfront.");
      throw e;
    }

    console.log(`Updating awsResources with cloudfront info`);
    try {
      updateAwsResourcesField("cloudFrontId", theCloud.Id);
    } catch (e) {
      console.error(`Unable to update awsResources.js`);
      console.error(e);
    }
  }

  // Always set bucket permissions (whether distribution is new or existing)
  console.log("Setting bucket permissions");
  policy.Statement[0].Resource = "arn:aws:s3:::".concat(s3BucketName).concat("/*");
  policy.Statement[0].Condition.StringEquals["AWS:SourceArn"] = theCloud.ARN;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const s3Client = factory.createClient(S3Client);
    await s3Client.send(
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

  if (domainName != "default") {
    try {
      makeRecordSet(domainName, projName, useIAM, theCloud);
    } catch (e) {
      console.error(`Unable to create or update record set for ${domainName}`);
      throw e;
    }
  }

  await syncMe;
  console.log(`Finished syncing files`);

  // Wait for CloudFront distribution to be fully deployed
  await waitForCloudFrontDeployment(theCloud.Id, useIAM);

  return theCloud.DomainName;
};

export { deployFrontEnd };
