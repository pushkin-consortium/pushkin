import {
  S3Client,
  CreateBucketCommand,
  ListBucketsCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import {
  CloudFrontClient,
  ListDistributionsCommand,
  CreateDistributionWithTagsCommand,
  CreateInvalidationCommand,
  GetOriginAccessControlCommand,
  CreateOriginAccessControlCommand,
  ListOriginAccessControlsCommand,
  GetDistributionConfigCommand,
  UpdateDistributionCommand,
  DeleteDistributionCommand,
  GetDistributionCommand,
  ListTagsForResourceCommand,
} from "@aws-sdk/client-cloudfront";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { cloudFront, OriginAccessControl, policy } from "../awsConfigs.js";
import { syncS3 } from "./s3.js";
import { makeRecordSet } from "./route53.js";
import { makeACL } from "./security.js";
import { AWS_REGION } from "../constants.js";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

/**
 * Deploys the front-end to S3 and CloudFront
 * @param {string} projName - The Pushkin project name
 * @param {string} awsName - The AWS resource name
 * @param {string} useIAM - The IAM role to use
 * @param {string} domainName - The domain name
 * @param {string} myCertificate - The SSL certificate
 * @param {string} builtFrontEnd - The built front-end assets
 * @returns {string} - The CloudFront domain name for the deployed front-end
 */
const deployFrontEnd = async (
  projName,
  awsName,
  useIAM,
  domainName,
  myCertificate,
  builtFrontEnd,
) => {
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const s3 = factory.createClient(S3Client);
  console.log(`Checking to see if bucket ${awsName} already exists.`);
  let bucketExists = false;
  try {
    const listBucketsCommand = new ListBucketsCommand({});
    const response = await s3.send(listBucketsCommand);
    response.Buckets.forEach((b) => {
      if (b.Name == awsName) {
        bucketExists = true;
        console.log(`Bucket exists. Skipping create.`);
      }
    });
  } catch (e) {
    console.error(`Problem listing aws s3 buckets for your account`);
    throw e;
  }

  let OAC = getOAC(useIAM); //this will create if necessary. Returns OAC as promise.
  let ACLarn = makeACL(useIAM); //this will create if necessary. Returns ACLID as promise.

  if (!bucketExists) {
    console.log("Bucket does not yet exist. Creating s3 bucket");
    try {
      const response = await s3.send(new CreateBucketCommand({ Bucket: awsName }));
    } catch (e) {
      console.error("Problem creating bucket for front-end");
      throw e;
    }
  }

  await builtFrontEnd; //need this before we sync!
  let syncMe;
  try {
    syncMe = syncS3(awsName, useIAM);
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
        tempCheck = d.Origins.Items[0].Id == awsName;
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
          `Distribution for ${awsName} found. Updating files. Note that if you do this more than 1000x/month, you'll start incurring extra charges.`,
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
    console.log(`No existing cloudFront distribution for ${awsName}. Creating distribution.`);
    let myCloudFront = JSON.parse(JSON.stringify(cloudFront));
    myCloudFront.DistributionConfig.Origins.Items[0].OriginAccessControlId = await OAC; //we'll need this before continuing.
    myCloudFront.DistributionConfig.WebACLId = await ACLarn; //we'll need this before continuing.
    myCloudFront.DistributionConfig.CallerReference = awsName;
    myCloudFront.DistributionConfig.DefaultCacheBehavior.TargetOriginId = awsName;
    myCloudFront.DistributionConfig.Origins.Items[0].Id = awsName;
    myCloudFront.DistributionConfig.Origins.Items[0].DomainName =
      awsName.concat(".s3.amazonaws.com");
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
      let awsResources = jsYaml.load(
        fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
      );
      awsResources.cloudFrontId = theCloud.Id;
      fs.writeFileSync(
        path.join(process.cwd(), "awsResources.js"),
        jsYaml.dump(awsResources),
        "utf8",
      );
    } catch (e) {
      console.error(`Unable to update awsResources.js`);
      console.error(e);
    }
  }

  // Always set bucket permissions (whether distribution is new or existing)
  console.log("Setting bucket permissions");
  policy.Statement[0].Resource = "arn:aws:s3:::".concat(awsName).concat("/*");
  policy.Statement[0].Condition.StringEquals["AWS:SourceArn"] = theCloud.ARN;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const s3Client = factory.createClient(S3Client);
    await s3Client.send(
      new PutBucketPolicyCommand({
        Bucket: awsName,
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

/**
 * Wait for CloudFront distribution to be fully deployed
 * @param {string} distributionId - The CloudFront distribution ID
 * @param {object} useIAM - The IAM profile to use
 * @returns {Promise<void>}
 */
const waitForCloudFrontDeployment = async (distributionId, useIAM) => {
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const cloudFrontClient = factory.createClient(CloudFrontClient);

  console.log(`\nWaiting for CloudFront distribution to be fully deployed...`);
  console.log(`This can take 5-15 minutes. Checking status every 30 seconds.`);

  let deployed = false;
  let checkCount = 0;
  const maxChecks = 40; // 40 checks * 30 seconds = 20 minutes max

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
        await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds
      }
    } catch (error) {
      console.error(`\nError checking CloudFront status: ${error.message}`);
      throw error;
    }
  }

  if (!deployed) {
    console.log(
      `\n⚠ CloudFront distribution is still deploying after ${(maxChecks * 30) / 60} minutes.`,
    );
    console.log(`Your site may not be immediately accessible. Check the status with:`);
    console.log(
      `aws cloudfront get-distribution --id ${distributionId} --query 'Distribution.Status'`,
    );
  }

  console.log(); // Add newline after progress dots
};

/**
 * Create the Access Control List if it doesn't already exist
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<string>} - The ACL ARN
 */
const getOAC = async (useIAM) => {
  /**
   * Creates the Origin Access Control
   * @param {string} useIAM - The IAM profile to use
   * @returns {Promise<string>} - The OAC ID
   */
  const createOAC = async (useIAM) => {
    let temp;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const cloudFrontClient = factory.createClient(CloudFrontClient);
      const createOACResponse = await cloudFrontClient.send(
        new CreateOriginAccessControlCommand({
          OriginAccessControlConfig: OriginAccessControl,
        }),
      );
      temp = { stdout: JSON.stringify(createOACResponse) };
    } catch (error) {
      console.error(`Unable to create Origin Access Control`);
      throw error;
    }
    return JSON.parse(temp.stdout).OriginAccessControl.Id;
  };

  console.log(`Checking to see if OAC already exists.`);

  let awsResources;
  try {
    awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
  } catch (e) {
    console.error(`Unable to read awsResources.js. That's strange.`);
    console.error(e);
    throw e;
  }

  let needOAC = false;

  if (awsResources && !awsResources.OAC) {
    console.log(`No origin access control. Creating.`);
    needOAC = true;
  } else {
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const cloudFrontClient = factory.createClient(CloudFrontClient);
      await cloudFrontClient.send(new GetOriginAccessControlCommand({ Id: awsResources.OAC }));
    } catch (e) {
      console.log(e);
      console.log(`Huh. I can't find that OAC. Making a new one.`);
      needOAC = true;
    }
  }

  if (needOAC) {
    // First, check if an OAC with our name already exists in AWS
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const cloudFrontClient = factory.createClient(CloudFrontClient);
      const listOACResponse = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));

      if (listOACResponse.OriginAccessControlList?.Items) {
        const existingOAC = listOACResponse.OriginAccessControlList.Items.find(
          (oac) => oac.Name === OriginAccessControl.Name,
        );

        if (existingOAC) {
          console.log(`Found existing OAC with name ${OriginAccessControl.Name}, reusing it.`);
          awsResources.OAC = existingOAC.Id;
        } else {
          // Create new OAC only if one with our name doesn't exist
          awsResources.OAC = await createOAC(useIAM);
        }
      } else {
        awsResources.OAC = await createOAC(useIAM);
      }
    } catch (error) {
      console.error(`Error checking for existing OAC: ${error.message}`);
      // Try creating anyway - if it fails, we'll get the original error
      awsResources.OAC = await createOAC(useIAM);
    }

    try {
      fs.writeFileSync(
        path.join(process.cwd(), "awsResources.js"),
        jsYaml.dump(awsResources),
        "utf8",
      );
    } catch (error) {
      console.error(`Can't write to awsResources.js. That's strange.`);
      throw error;
    }
  }

  return Promise.resolve(awsResources.OAC);
};

/**
 *
 * @param useIAM
 * @param projName
 * @param killTag
 */
const deleteCloudFront = async (useIAM, projName, killTag) => {
  // First, get list of distributions we need to delete
  let tempDists;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const cloudFrontClient = factory.createClient(CloudFrontClient);
    const listDistributionsResponse = await cloudFrontClient.send(new ListDistributionsCommand({}));
    tempDists = {
      stdout: JSON.stringify({ DistributionList: listDistributionsResponse.DistributionList }),
    };
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`);
    throw e;
  }
  const parsedDists = JSON.parse(tempDists.stdout);
  if (
    !parsedDists.DistributionList ||
    !parsedDists.DistributionList.Items ||
    parsedDists.DistributionList.Items.length === 0
  ) {
    console.log(`No cloudfront distributions found. Skipping.`);
    return true;
  } else {
    //found something
    let distributions = [];
    for (const d of parsedDists.DistributionList.Items) {
      if (killTag) {
        //check whether this is tagged to our project
        let tempTagCheck;
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const cloudFrontClient = factory.createClient(CloudFrontClient);
          const listTagsResponse = await cloudFrontClient.send(
            new ListTagsForResourceCommand({ Resource: d.ARN }),
          );
          // CloudFront returns Tags.Items, not Tags directly
          const tags = listTagsResponse.Tags?.Items || [];
          tempTagCheck = JSON.stringify({ Tags: tags });
        } catch (e) {
          console.error(`Unable to get tags for cloudfront distribution ${d.ARN}`);
          tempTagCheck = JSON.stringify({ Tags: [] });
        }
        const parsedTags = JSON.parse(tempTagCheck);
        if (parsedTags.Tags && Array.isArray(parsedTags.Tags)) {
          parsedTags.Tags.forEach((t) => {
            if ((t.Key == "PUSHKIN") & (t.Value == projName)) {
              distributions.push(d.Id);
            }
          });
        }
      } else {
        //kill them all
        distributions.push(d.Id);
      }
    }

    /**
     *
     * @param distId
     */
    const checkCloudFront = async (distId) => {
      let distributionExists = false;
      let distributionReady = false;
      let temp;
      try {
        const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const cloudFrontClient = factory.createClient(CloudFrontClient);
        const listDistributionsResponse = await cloudFrontClient.send(
          new ListDistributionsCommand({}),
        );
        temp = {
          stdout: JSON.stringify({ DistributionList: listDistributionsResponse.DistributionList }),
        };
      } catch (e) {
        console.error(`Unable to get list of cloudfront distributions`);
        throw e;
      }
      if (temp.stdout != "") {
        JSON.parse(temp.stdout).DistributionList.Items.forEach((d) => {
          let tempCheck = false;
          try {
            tempCheck = d.Id == distId;
          } catch (e) {
            // Probably not a fully created cloudfront distribution.
            // Probably can ignore this.
            console.warn(
              "\x1b[31m%s\x1b[0m",
              `Problem reading cloudFront distribution information.`,
            );
            throw e;
          }
          if (tempCheck) {
            distributionReady = (d.Enabled == false) & (d.Status != "InProgress");
            distributionExists = true;
          }
        });
      }
      if (!distributionExists) {
        console.error(`Unable to find cloudfront distribution ${distId}. That is very strange.`);
      }
      return distributionReady;
    };

    // Now, disable and delete each distribution
    return Promise.all(
      distributions.map(async (distId) => {
        let cloudConfig;
        let ETag;
        let aDistributionConfig;
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const cloudFrontClient = factory.createClient(CloudFrontClient);
          aDistributionConfig = await cloudFrontClient.send(
            new GetDistributionConfigCommand({ Id: distId }),
          );
          cloudConfig = aDistributionConfig.DistributionConfig;
          ETag = aDistributionConfig.ETag;
        } catch (e) {
          console.log(
            `Cannot find cloudfront distribution ${distId}. May have already been deleted. Skipping.`,
          );
          return true;
        }

        cloudConfig.Enabled = false; //This is the only thing to update
        console.log(`Disabling cloudfront distribution ` + distId);

        let disableCloudFront;
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const cloudFrontClient = factory.createClient(CloudFrontClient);
          disableCloudFront = await cloudFrontClient.send(
            new UpdateDistributionCommand({
              Id: distId,
              IfMatch: ETag,
              DistributionConfig: cloudConfig,
            }),
          );
        } catch (e) {
          console.error(
            `Possibly unable to disable cloudfront distribution ${distId}.\n Sometimes this throws errors but works anyway, so we'll continue and see what happens...\n`,
          );
        }

        return new Promise((resolve, reject) => {
          /**
           *
           */
          const wait = async () => {
            //Sometimes, I really miss loops
            let aDistributionConfig;
            let x = await checkCloudFront(distId);
            if (x) {
              console.log(`Cloudfront is disabled. Deleting.`);
              //Apparently the ETag changes after disabling? So we need to get it again.
              try {
                const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
                const factory = new AWSClientFactory(AWS_REGION, profileName);
                const cloudFrontClient = factory.createClient(CloudFrontClient);
                const getDistributionConfigResponse = await cloudFrontClient.send(
                  new GetDistributionConfigCommand({ Id: distId }),
                );
                aDistributionConfig = await cloudFrontClient.send(
                  new GetDistributionCommand({ Id: distId }),
                );
                cloudConfig = getDistributionConfigResponse.DistributionConfig;
                ETag = getDistributionConfigResponse.ETag;
              } catch (e) {
                console.log(
                  `Suddenly can't find cloudfront distribution ${distId}. Which is very strange, since we haven't deleted it yet. Skipping for now...`,
                );
                resolve(true);
              }
              //Armed with the new ETag, we can delete the distribution
              try {
                const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
                const factory = new AWSClientFactory(AWS_REGION, profileName);
                const cloudFrontClient = factory.createClient(CloudFrontClient);
                await cloudFrontClient.send(
                  new DeleteDistributionCommand({ Id: distId, IfMatch: ETag }),
                );
              } catch (e) {
                console.error(`Unable to delete cloudfront distribution`);
                try {
                  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
                  const factory = new AWSClientFactory(AWS_REGION, profileName);
                  const cloudFrontClient = factory.createClient(CloudFrontClient);
                  const getDistributionResponse = await cloudFrontClient.send(
                    new GetDistributionCommand({ Id: distId }),
                  );
                  resolve(getDistributionResponse);
                } catch (e) {
                  console.error(e);
                  if (aDistributionConfig.Distribution.Status != "InProgress") {
                    console.error(
                      `Unable to delete cloudfront distribution. It may be worth running pushkin aws armageddon again.`,
                    );
                    resolve(false);
                  }
                }
                console.error(e);
              }
              try {
                let awsResources = jsYaml.load(
                  fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
                );
                awsResources.cloudFrontId = null;
                fs.writeFileSync(
                  path.join(process.cwd(), "awsResources.js"),
                  jsYaml.dump(awsResources),
                  "utf8",
                );
              } catch (e) {
                console.error(`Unable to update awsResources.js`);
                console.error(e);
              }
              resolve(true);
            } else {
              console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
              setTimeout(wait, 30000);
            }
          };

          console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`);
          wait();
        });
      }),
    );
  }
};

/**
 *
 * @param useIAM
 * @param deletedCloudFront
 * @param killTag
 */
const deleteOACs = async (useIAM, deletedCloudFront, killTag) => {
  //FUBAR Need to killize this
  deletedCloudFront = await deletedCloudFront;

  // Wait for CloudFront to fully release OAC references on AWS backend
  // Even after CloudFront deletion completes, AWS needs time to clean up OAC associations
  console.log("Waiting 30 seconds for CloudFront to fully release OAC references...");
  await new Promise((resolve) => setTimeout(resolve, 30000));

  let temp;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const cloudFrontClient = factory.createClient(CloudFrontClient);
    const listOACResponse = await cloudFrontClient.send(new ListOriginAccessControlsCommand({}));
    temp = {
      stdout: JSON.stringify({ OriginAccessControlList: listOACResponse.OriginAccessControlList }),
    };
  } catch (e) {
    console.error(`Unable to get list of origin access controls`);
    throw e;
  }
  if (temp.stdout != "" && JSON.parse(temp.stdout).OriginAccessControlList.Items) {
    for (const d of JSON.parse(temp.stdout).OriginAccessControlList.Items) {
      let etag;
      try {
        const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const cloudFrontClient = factory.createClient(CloudFrontClient);
        const getOACResponse = await cloudFrontClient.send(
          new GetOriginAccessControlCommand({ Id: d.Id }),
        );
        etag = getOACResponse.ETag;
      } catch (e) {
        console.error(`Unable to get etag for origin access control ${d.Id}`);
        throw e;
      }
      // Retry OAC deletion with delays (CloudFront may still be releasing it)
      let deleteOAC;
      const maxRetries = 10;
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const cloudFrontClient = factory.createClient(CloudFrontClient);
          deleteOAC = await cloudFrontClient.send(
            new DeleteOriginAccessControlCommand({ Id: d.Id, IfMatch: etag }),
          );
          break; // Success, exit retry loop
        } catch (e) {
          lastError = e;

          // If it's still in use, wait and retry
          if (e.name === "OriginAccessControlInUse" && attempt < maxRetries - 1) {
            const waitTime = 10000; // Wait 10 seconds between retries
            console.log(
              `OAC ${d.Id} still in use, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }

          // Other error or final attempt - throw
          console.error(`Unable to delete origin access control ${d.Id}`);
          console.error(`Failed to delete origin access control ${d.Id}`);
          console.error(e);
          throw e;
        }
      }
      console.log(`Updating awsResources with cloudfront info`);
      try {
        let awsResources = jsYaml.load(
          fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
        );
        awsResources.OAC = null;
        fs.writeFileSync(
          path.join(process.cwd(), "awsResources.js"),
          jsYaml.dump(awsResources),
          "utf8",
        );
      } catch (e) {
        console.error(`Unable to update awsResources.js`);
        console.error(e);
      }
    }
  }
  return true;
};
// Export all functions
export { deployFrontEnd, waitForCloudFrontDeployment, getOAC, deleteCloudFront, deleteOACs };
