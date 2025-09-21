import { v4 as uuid } from "uuid";
import fs from "graceful-fs";
import path from "path";
import util from "util";
import pacMan from "../../pMan.js"; //which package manager is available?
import { execSync } from 'child_process'; // eslint-disable-line
import jsYaml from "js-yaml";
import {
  pushkinACL,
  OriginAccessControl,
  policy,
  cloudFront,
  dbConfig,
  rabbitTask,
  apiTask,
  workerTask,
  changeSet,
  alarmRAMHigh,
  alarmCPUHigh,
  alarmRDSHigh,
  scalingPolicyTargets,
} from "./awsConfigs.js";
import { runMigrations, getMigrations } from "../setupdb/index.js";
import { updatePushkinJs, readConfig } from "../prep/index.js";
import inquirer from "inquirer";
import crypto from "crypto";
import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { fromIni } from "@aws-sdk/credential-provider-ini";
import { ACMClient, ListCertificatesCommand } from "@aws-sdk/client-acm";
import {
  Route53Client,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
import { Route53DomainsClient, ListDomainsCommand } from "@aws-sdk/client-route-53-domains";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  CreateDBInstanceCommand,
  ModifyDBInstanceCommand,
  DeleteDBInstanceCommand,
  DescribeDBSnapshotsCommand,
  waitUntilDBInstanceAvailable,
} from "@aws-sdk/client-rds";
import {
  CloudFrontClient,
  ListDistributionsCommand,
  CreateInvalidationCommand,
  CreateDistributionWithTagsCommand,
  CreateOriginAccessControlCommand,
  GetOriginAccessControlCommand,
  ListTagsForResourceCommand,
  GetDistributionConfigCommand,
  DeleteDistributionCommand,
  GetDistributionCommand,
  ListOriginAccessControlsCommand,
  DeleteOriginAccessControlCommand,
  UpdateDistributionCommand,
} from "@aws-sdk/client-cloudfront";
import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
  DescribeLoadBalancersCommand,
  DescribeListenersCommand,
  DeleteListenerCommand,
  DeleteLoadBalancerCommand,
  DescribeTargetGroupsCommand,
  DeleteTargetGroupCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListTasksCommand,
  StopTaskCommand,
  ListServicesCommand,
  DeleteServiceCommand,
  DeleteClusterCommand,
} from "@aws-sdk/client-ecs";
import {
  EC2Client,
  DescribeKeyPairsCommand,
  CreateKeyPairCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
  DeleteSecurityGroupCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
} from "@aws-sdk/client-ec2";
import {
  CloudFormationClient,
  ListStacksCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
} from "@aws-sdk/client-cloudformation";
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { WAFV2Client, ListWebACLsCommand, CreateWebACLCommand } from "@aws-sdk/client-wafv2";

const myRegion = "us-east-1"; //set as default. may want this to be a parameter somewhere that can be changed.

const exec = util.promisify(require("child_process").exec);
const mkdir = util.promisify(require("fs").mkdir);

/**
 * Helper function to create RDS client
 * @param {*} useIAM - The IAM user to use
 * @returns {RDSClient} - The RDS client
 */
const createRDSClient = (useIAM) => {
  return new RDSClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create S3 client
 * @param {*} useIAM - The IAM user to use
 * @returns {S3Client} - The S3 client
 */
const createS3Client = (useIAM) => {
  return new S3Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create Elastic Load Balancing v2 client
 * @param {*} useIAM - The IAM user to use
 * @returns {ElasticLoadBalancingV2Client} - The ELBv2 client
 */
const createELBv2Client = (useIAM) => {
  return new ElasticLoadBalancingV2Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create CloudFront client
 * @param {*} useIAM - The IAM user to use
 * @returns {CloudFrontClient} - The CloudFront client
 */
const createCloudFrontClient = (useIAM) => {
  return new CloudFrontClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create Route 53 client
 * @param {*} useIAM - The IAM user to use
 * @returns {Route53Client} - The Route 53 client
 */
const createRoute53Client = (useIAM) => {
  return new Route53Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create Route 53 Domains client
 * @param {*} useIAM - The IAM user to use
 * @returns {Route53DomainsClient} - The Route 53 Domains client
 */
const createRoute53DomainsClient = (useIAM) => {
  return new Route53DomainsClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create ECS client
 * @param {*} useIAM - The IAM user to use
 * @returns {ECSClient} - The ECS client
 */
const createECSClient = (useIAM) => {
  return new ECSClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM.iam }),
  });
};

/**
 * Helper function to create EC2 client
 * @param {*} useIAM - The IAM user to use
 * @returns {EC2Client} - The EC2 client
 */
const createEC2Client = (useIAM) => {
  return new EC2Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM.iam }),
  });
};

/**
 * Helper function to create CloudFormation client
 * @param {*} useIAM - The IAM user to use
 * @returns {CloudFormationClient} - The CloudFormation client
 */
const createCloudFormationClient = (useIAM) => {
  return new CloudFormationClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create CloudWatch Logs client
 * @param {*} useIAM - The IAM user to use
 * @returns {CloudWatchLogsClient} - The CloudWatch Logs client
 */
const createCloudWatchLogsClient = (useIAM) => {
  return new CloudWatchLogsClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Helper function to create WAFv2 client
 * @param {*} useIAM - The IAM user to use
 * @returns {WAFV2Client} - The WAFv2 client
 */
const createWAFv2Client = (useIAM) => {
  return new WAFV2Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });
};

/**
 * Check if the IAM user is configured on the AWS SDK
 * @param {*} useIAM - The IAM user to check
 */
export const checkIAMUser = async (useIAM) => {
  const sts = new STSClient({
    credentials: fromIni({ profile: useIAM.iam }),
  });

  try {
    await sts.send(new GetCallerIdentityCommand({}));
  } catch (e) {
    console.error(
      `The IAM user ${useIAM.iam} is not configured on the AWS SDK. For more information see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-shared.html`,
    );
    throw e;
  }
};

/**
 * Publish Docker images to DockerHub
 * @param {string} DHID - The DockerHub ID
 * @param {Promise} rebuiltWorkers - A promise that resolves when the workers are rebuilt
 * @returns {Promise} - A promise that resolves when the images are published
 */
const publishToDocker = async (DHID, rebuiltWorkers) => {
  console.log("Publishing images to DockerHub");
  console.log("Building API");
  try {
    execSync(
      `docker buildx build --platform linux/amd64 -t ${DHID}/api:latest pushkin/api --load`,
      { cwd: process.cwd() },
    );
  } catch (e) {
    console.error(`Problem building API`);
    throw e;
  }
  console.log("Pushing API to DockerHub");
  let pushedAPI;
  try {
    pushedAPI = exec(`docker push ${DHID}/api:latest`, { cwd: process.cwd() });
  } catch (e) {
    console.error(`Couldn't push API to DockerHub`);
    throw e;
  }

  //note: don't need to rebuild server, because we use S3
  let docker_compose;
  try {
    docker_compose = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "pushkin/docker-compose.dev.yml"), "utf8"),
    );
  } catch (e) {
    console.error("Failed to load the docker-compose. That is extremely odd.");
    throw e;
  }

  /**
   * Push workers to DockerHub
   * @param {string} s - The service name
   * @returns {Promise<string>} - A promise that resolves when the workers of the service is pushed
   */
  const pushWorkers = async (s) => {
    const service = docker_compose.services[s];
    if (service.labels == null) {
      // not a worker
      return "";
    }
    if (service.labels.isPushkinWorker != true) {
      // not a worker
      return "";
    }

    console.log(`Pushkin ${s}`);
    try {
      const imageName = service.image.split(":")[0];
      execSync(`docker tag ${service.image} ${DHID}/${imageName}:latest`);
    } catch (e) {
      console.error(`Unable to tag image ${service.image}`);
      throw e;
    }
    try {
      const imageName = service.image.split(":")[0];
      return exec(`docker push ${DHID}/${imageName}:latest`);
    } catch (e) {
      console.error(`Unable to push image ${service.image}`);
      throw e;
    }
  };

  await rebuiltWorkers; //can't push until these are built

  let pushedWorkers;
  try {
    pushedWorkers = Object.keys(docker_compose.services).map(pushWorkers);
  } catch (e) {
    console.log(`Unable to push worker images to DockerHub`);
    throw e;
  }

  return Promise.all([pushedAPI, pushedWorkers]);
};

/**
 * Build the project front-end
 * @param {string} projName - The project name
 * @returns {Promise} - A promise that resolves when the front-end is built
 */
const buildFE = function (projName) {
  return new Promise((resolve, reject) => {
    //can we use build-if-changed?
    console.log("Building front-end");
    const packageJsonPath = path.join(process.cwd(), "pushkin/front-end/package.json");
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch (e) {
      console.error("Failed to parse front-end package.json");
      throw e;
    }
    let buildCmd;
    if (packageJson.dependencies["build-if-changed"] == null) {
      console.log(
        projName,
        " does not have build-if-changed installed. Recommend installation for faster runs of prep.",
      );
      buildCmd = pacMan.concat(" --mutex network run build");
    } else {
      console.log("Using build-if-changed for", projName);
      const pacRunner = pacMan == "yarn" ? "yarn" : "npx";
      buildCmd = pacRunner.concat(" build-if-changed --mutex network");
    }
    let builtWeb;
    console.log("Building combined front-end");
    try {
      builtWeb = exec(buildCmd, { cwd: path.join(process.cwd(), "pushkin/front-end") }).then(() => {
        console.log("Installed combined front-end");
        resolve(builtWeb);
      });
    } catch (error) {
      console.error("Problem installing and buiding combined front-end");
      console.error(error);
      process.exit();
    }
  });
};

/**
 * Sync the local build with the S3 bucket
 * @param {string} awsName - The S3 bucket name
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise} - A promise that resolves when the sync is complete
 */
export const syncS3 = async (awsName, useIAM) => {
  console.log("Syncing files to bucket");
  try {
    // TODO: This aws s3 sync command needs to be migrated to SDK
    // It requires implementing file upload functionality with PutObjectCommand
    // and directory traversal to match the sync behavior
    return exec(`aws s3 sync build/ s3://${awsName} --profile ${useIAM}`, {
      cwd: path.join(process.cwd(), "pushkin/front-end"),
    });
  } catch (e) {
    console.error(`Unable to sync local build with s3 bucket`);
    throw e;
  }
};

/**
 * This function is called from within deployFrontEnd(). It creates four Route53 DNS records for the specified domainName for the CloudFront distribution created in deployFrontEnd().
 * @param {string} domainName - The domain name
 * @param {string} projName - The project name
 * @param {string} useIAM - The IAM profile to use
 * @param {object} theCloud - The CloudFront distribution object
 * @returns {Promise} - A promise that resolves when the record set is created or updated
 */
const makeRecordSet = async (domainName, projName, useIAM, theCloud) => {
  const route53 = new Route53Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM.iam }),
  });

  let zoneID;

  try {
    const data = await route53.send(
      new ListHostedZonesByNameCommand({ DNSName: domainName, hostedZoneId: zoneID }),
    );
    if (data.HostedZones.length === 0) {
      console.error(`No hostedzone found for ${domainName}`);
      throw new Error(`No hostedzone found for ${domainName}`);
    }
    zoneID = data.HostedZones[0].Id.split("/hostedzone/")[1];
  } catch (e) {
    console.error(`Unable to retrieve hostedzone for ${domainName}`);
    throw e;
  }

  // if there was a failed init, there may already be resource record sets
  // which will cause this to fail. So, we'll try to delete them first.
  let existingRecords;
  try {
    const data = await route53.send(new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }));
    existingRecords = data.ResourceRecordSets;
  } catch (e) {
    console.error(`Unable to list resource record sets for ${domainName}`);
    throw e;
  }

  if (existingRecords.length > 0) {
    console.log(`Deleting existing resource record sets for ${domainName}`);
    const changes = existingRecords.map((record) => ({
      Action: "DELETE",
      ResourceRecordSet: record,
    }));

    try {
      await route53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: zoneID,
          ChangeBatch: { Changes: changes },
        }),
      );
    } catch (e) {
      console.error(`Unable to delete resource record sets for ${domainName}: ${e}`);
    }
  }

  /**
   * Creates a recordset change object for the DNS record
   * @param {string} name - The DNS record name users will access
   * @param {string} dnsName - The DNS name of the CloudFront distribution
   * @param {string} type - The DNS record type (A or AAAA)
   * @param {string} setIdentifier - The set identifier for the record
   * @returns {object} - The change object
   */
  const createChange = (name, dnsName, type, setIdentifier) => ({
    Action: "UPSERT",
    ResourceRecordSet: {
      Name: name,
      Type: type,
      SetIdentifier: setIdentifier,
      Region: myRegion,
      AliasTarget: {
        HostedZoneId: "Z2FDTNDATAQYW2",
        DNSName: dnsName,
        EvaluateTargetHealth: false,
      },
    },
  });

  let recordSet = {
    Comment: "",
    Changes: [
      createChange(domainName, theCloud.DomainName, "A", projName),
      createChange(domainName, theCloud.DomainName, "AAAA", projName),
      createChange(`www.${domainName}`, theCloud.DomainName, "A", projName),
      createChange(`www.${domainName}`, theCloud.DomainName, "AAAA", projName),
    ],
  };

  /**
   * Waits for all resource record sets to be deleted for a given hosted zone
   * @param zoneID - The hosted zone ID
   */
  const waitForRecordSetDeletion = async (zoneID) => {
    while (true) {
      try {
        const data = await route53.send(
          new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }),
        );
        existingRecords = data.ResourceRecordSets;
      } catch (e) {
        console.error(`Unable to list resource record sets for ${zoneID}`);
        throw e;
      }

      if (existingRecords.some((r) => r.SetIdentifier)) {
        console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`);

        for (const record of existingRecords) {
          if (record.SetIdentifier) {
            console.log(
              `found SetIdentifier ${record.SetIdentifier} for ${record.Name}, ${record.Type}`,
            );
            //try deleting this record set
            try {
              await route53.send(
                new ChangeResourceRecordSetsCommand({
                  HostedZoneId: zoneID,
                  ChangeBatch: {
                    Changes: [
                      {
                        Action: "DELETE",
                        ResourceRecordSet: record,
                      },
                    ],
                  },
                }),
              );
            } catch (e) {
              console.error(
                `Unable to delete resource record set ${record.SetIdentifier} for ${zoneID}`,
              );
              console.error(e);
            }
          } else {
            console.log(
              `No SetIdentifier ${record.SetIdentifier} for ${record.Name}, ${record.Type}`,
            );
          }
        }
      } else {
        console.log(`All resource record sets for zone ${zoneID} have been deleted.`);
        break;
      }

      console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`);
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  };

  await waitForRecordSetDeletion(zoneID);

  // create the new record set
  let returnVal;

  try {
    console.log(`Creating resource record sets for ${domainName}`);
    returnVal = await route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneID,
        ChangeBatch: recordSet,
      }),
    );
    console.log(`Updated record set for ${domainName}.`);
  } catch (e) {
    console.error(`Unable to create resource record set for ${domainName}`);
    throw e;
  }

  return returnVal;
};

/**
 * Deploys the front-end to S3 and CloudFront
 * @param {string} projName - The Pushkin project name
 * @param {string} awsName - The AWS resource name
 * @param {string} useIAM - The IAM role to use
 * @param {string} domainName - The domain name
 * @param {string} myCertificate - The SSL certificate
 * @param {string} builtFrontEnd - The built front-end assets
 * @returns
 */
const deployFrontEnd = async (
  projName,
  awsName,
  useIAM,
  domainName,
  myCertificate,
  builtFrontEnd,
) => {
  const s3 = new S3Client({
    region: myRegion,
    credentials: fromIni({ profile: useIAM.iam }),
  });
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
  const cloudFrontClient = new CloudFrontClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM.iam }),
  });
  try {
    distributions = await cloudFrontClient.send(new ListDistributionsCommand({}));
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`);
    throw e;
  }
  if (distributions.DistributionList.Items.length > 0) {
    distributions.DistributionList.Items.forEach((d) => {
      let tempCheck = false;
      try {
        tempCheck = d.Origins.Items[0].Id == awsName;
      } catch (e) { //eslint-disable-line
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
      myCloudFront.DistributionConfig.Aliases.Quantity = 2;
      myCloudFront.DistributionConfig.Aliases.Items = [domainName, "www.".concat(domainName)];
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

    console.log("Setting bucket permissions");
    policy.Statement[0].Resource = "arn:aws:s3:::".concat(awsName).concat("/*");
    policy.Statement[0].Condition.StringEquals["AWS:SourceArn"] = theCloud.ARN;
    try {
      const s3Client = createS3Client(useIAM);
      await s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: awsName,
          Policy: JSON.stringify(policy),
        }),
      );
    } catch (e) {
      console.error("Problem setting bucket permissions for front-end");
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

  return theCloud.DomainName;
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
      const cloudFrontClient = createCloudFrontClient(useIAM);
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
      const cloudFrontClient = createCloudFrontClient(useIAM);
      await cloudFrontClient.send(new GetOriginAccessControlCommand({ Id: awsResources.OAC }));
    } catch (e) {
      console.log(e);
      console.log(`Huh. I can't find that OAC. Making a new one.`);
      needOAC = true;
    }
  }

  if (needOAC) {
    awsResources.OAC = await createOAC(useIAM);
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
 * Create the Access Control List if it doesn't already exist
 * @param {string} dbType - The type of database (e.g., 'postgres', 'mysql')
 * @param {string} securityGroupID - The security group ID for the database
 * @param {string} projName - The project name
 * @param {string} awsName - The AWS resource name
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<object>} - The database connection details
 */
const initDB = async (dbType, securityGroupID, projName, awsName, useIAM) => {
  console.log(`Handling ${dbType} database.`);
  let stdOut, dbName, dbPassword;
  dbName = projName.concat(dbType).replace(/[^A-Za-z0-9]/g, "");

  /**
   * Determine if a new database is needed
   * @param {string} dbName - The name of the database
   * @param {string} dbType - The type of database (e.g., 'postgres', 'mysql')
   * @param {string} useIAM - The IAM profile to use
   * @returns {Promise<boolean>} - Whether a new database is needed
   */
  const doINeedDB = async (dbName, dbType, useIAM) => {
    //First, check pushkin.yaml -- do we have a database already?
    let temp;
    let pushkinConfig;
    try {
      temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
      pushkinConfig = jsYaml.load(temp);
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`);
      throw e;
    }
    if (
      pushkinConfig.productionDBs &&
      Object.keys(pushkinConfig.productionDBs).includes(dbType) &&
      pushkinConfig.productionDBs[dbType].name == dbName
    ) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `${dbName} is in pushkin.yaml. If that surprises you, look into it.\n Checking whether it is also on RDS.`,
      );
      //check whether it's fully configured in RDS
      //First, check to see if database exists
      let dbInstances;
      try {
        const rdsClient = createRDSClient(useIAM);
        const command = new DescribeDBInstancesCommand({});
        const response = await rdsClient.send(command);
        dbInstances = response.DBInstances;
      } catch (e) {
        console.error(`Unable to get list of RDS databases`);
        throw e;
      }
      let foundDB = false;
      let retrievedDBInfo;
      dbInstances.forEach((db) => {
        if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
          foundDB = true;
          retrievedDBInfo = db;
        }
      });
      if (foundDB) {
        //Does its parameters match what we expect?
        let sameParams = true;
        if (
          pushkinConfig.productionDBs[dbType].name.toLowerCase() !=
          retrievedDBInfo.DBName.toLowerCase()
        ) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database name on RDS does not match pushkin.yaml`);
        }
        if (pushkinConfig.productionDBs[dbType].user != retrievedDBInfo.MasterUsername) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database user on RDS does not match pushkin.yaml`);
        }
        //if (pushkinConfig.productionDBs[dbType].pass != FUBAR) {sameParams = false} //No way to check the password; assume if rest is correct, that's still correct
        if (pushkinConfig.productionDBs[dbType].port != retrievedDBInfo.Endpoint.Port) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database port on RDS does not match pushkin.yaml`);
        }
        if (pushkinConfig.productionDBs[dbType].host != retrievedDBInfo.Endpoint.Address) {
          sameParams = false;
          console.warn("\x1b[31m%s\x1b[0m", `Database host on RDS does not match pushkin.yaml`);
        }
        if (sameParams) {
          console.log(
            `${dbName} is already configured on RDS. Skipping.\n Note that if the password stored in the YAML is wrong, the CLI can't check that.`,
          );
          return false; //let's us skip creation later on
        } else {
          console.error(`${dbName} is already configured on RDS, but with different parameters.`);
          console.error(`Pushkin.yaml has:`, pushkinConfig.productionDBs[dbType]);
          console.error(`RDS has:`, retrievedDBInfo);
          process.exit();
        }
      } else {
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Database listed in pushkin.yaml, but not found on RDS. Creating.`,
        );
        return true;
      }
    } else {
      let dbInstances;
      try {
        const rdsClient = createRDSClient(useIAM);
        const command = new DescribeDBInstancesCommand({});
        const response = await rdsClient.send(command);
        dbInstances = response.DBInstances;
      } catch (e) {
        console.error(`Unable to get list of RDS databases`);
        throw e;
      }
      let foundDB = false;

      dbInstances.forEach((db) => {
        if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
          foundDB = true;
        }
      });
      if (foundDB) {
        //We can't easily work around this, because we don't have the password saved anywhere!
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Database ${dbName} found on RDS, but not listed in pushkin.yaml. This is a problem.\n
          You will need to delete the database from RDS before continuing.`,
        );
        process.exit();
      } else {
        return true;
      }
    }
  };

  let needDB = await doINeedDB(dbName, dbType, useIAM);
  if (needDB) {
    /**
     * Function to generate a secure random password
     * @returns {string} - A secure random password
     */
    const generateSecurePassword = () => {
      const length = 12;
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%^&*()-_=+";
      let password = "";

      for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
      }

      return password;
    };

    dbPassword = generateSecurePassword(); //Pick random password for database
    let myDBConfig = JSON.parse(JSON.stringify(dbConfig));
    myDBConfig.DBName = dbName;
    myDBConfig.DBInstanceIdentifier = dbName;
    myDBConfig.VpcSecurityGroupIds = [securityGroupID];
    myDBConfig.MasterUserPassword = dbPassword;
    myDBConfig.Tags[0].Value = projName;

    try {
      const rdsClient = createRDSClient(useIAM);
      const command = new CreateDBInstanceCommand(myDBConfig);
      await rdsClient.send(command);
    } catch (e) {
      console.error(`Unable to create database ${dbType}`);
      throw e;
    }

    console.log(`Database ${dbType} created with following:`, myDBConfig);
    console.log(`Database ${dbType} created.`);

    try {
      // should hang until instance is available
      console.log(`Waiting for ${dbType} to spool up. This may take a while...`);
      const rdsClient = createRDSClient(useIAM);
      await waitUntilDBInstanceAvailable(
        {
          client: rdsClient,
          maxWaitTime: 1200, // 20 minutes timeout
        },
        { DBInstanceIdentifier: dbName },
      );
      console.log(`${dbType} is spooled up!`);
    } catch (e) {
      console.error(`Problem waiting for ${dbType} to spool up.`);
      throw e;
    }

    let dbEndpoint;
    try {
      const rdsClient = createRDSClient(useIAM);
      const command = new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbName });
      dbEndpoint = await rdsClient.send(command);
    } catch (e) {
      console.error(`Problem getting ${dbType} endpoint.`);
      throw e;
    }

    //Updating list of AWS resources
    console.log("Updated awsResources with db information");
    try {
      let awsResources = jsYaml.load(
        fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
      );
      if (awsResources && awsResources.dbs) {
        awsResources.dbs.push(dbName);
      } else {
        awsResources.dbs = [dbName];
      }
      fs.writeFileSync(
        path.join(process.cwd(), "awsResources.js"),
        jsYaml.dump(awsResources),
        "utf8",
      );
    } catch (e) {
      console.error(`Unable to update awsResources.js`);
      console.error(e);
    }

    const newDB = {
      type: dbType,
      name: dbName,
      host: dbEndpoint.DBInstances[0].Endpoint.Address,
      url: dbEndpoint.DBInstances[0].Endpoint.Address, //this is same as 'host' for AWS, but different for local deploy in Docker
      user: myDBConfig.MasterUsername,
      pass: myDBConfig.MasterUserPassword,
      port: myDBConfig.Port,
    };

    return newDB;
  } else {
    //Already set up. Just return the info.
    let temp;
    let pushkinConfig;
    try {
      temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
      pushkinConfig = jsYaml.load(temp);
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`);
      throw e;
    }
    return pushkinConfig.productionDBs[dbType];
  }
};

/**
 * Retrieve database connection information from pushkin.yaml
 * @returns {Promise<object>} - The database connection details
 */
const getDBInfo = async () => {
  let temp;
  let pushkinConfig;
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(temp);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }
  if (Object.keys(pushkinConfig.productionDBs).length >= 2) {
    let dbsByType = {};
    Object.keys(pushkinConfig.productionDBs).forEach((d) => {
      dbsByType[pushkinConfig.productionDBs[d].type] = {
        name: pushkinConfig.productionDBs[d].name,
        username: pushkinConfig.productionDBs[d].user,
        password: pushkinConfig.productionDBs[d].pass,
        port: pushkinConfig.productionDBs[d].port,
        endpoint: pushkinConfig.productionDBs[d].host,
      };
    });
    return dbsByType;
  } else {
    throw new Error(`Error finding production DBs in pushkin.yaml`);
  }
};

/**
 * Create ECS tasks for the API and workers
 * @param {string} projName - The name of the project
 * @param {boolean} useIAM - Whether to use IAM roles
 * @param {string} DHID - The DataHub ID
 * @param {Array} completedDBs - The list of completed databases
 * @param {string} ECSName - The name of the ECS cluster
 * @param {string} targGroupARN - The target group ARN
 * @returns {Promise} - A promise that resolves when the ECS tasks are created
 */
const ecsTaskCreator = async (projName, useIAM, DHID, completedDBs, ECSName, targGroupARN) => {
  try {
    if (fs.existsSync(path.join(process.cwd(), "ECStasks"))) {
      //nothing
    } else {
      console.log("Making ECSTasks folder");
      await mkdir(path.join(process.cwd(), "ECStasks"));
    }
  } catch (e) {
    console.error(`Problem with ECSTasks folder`);
    throw e;
  }

  /**
   * Create and deploy an ECS task using ecs-cli compose
   * @param {string} yaml - The name of the YAML file to create
   * @param {object} task - The ECS task definition
   * @param {string} name - The name of the ECS service
   * @param {number} port - The port for the ECS service
   * @param {string} targGroupARN - The target group ARN for the ECS service
   * @returns {Promise} - A promise that resolves when the ECS task is created
   */
  const ecsCompose = async (yaml, task, name, port = 0, targGroupARN = false) => {
    /**
     * Wait for the ECS cluster to have registered container instances
     * @returns {Promise} - A promise that resolves when the ECS cluster is ready
     */
    const wait = async () => {
      //Sometimes, I really miss loops
      let x;
      try {
        const ecsClient = createECSClient(useIAM);
        const describeClustersResponse = await ecsClient.send(
          new DescribeClustersCommand({
            clusters: [ECSName],
          }),
        );
        x = describeClustersResponse.clusters[0].registeredContainerInstancesCount;
      } catch (err) {
        console.error(err);
        x = 0;
      }
      if (x > 0) {
        try {
          console.log(`Writing ECS task list ${name}`);
          await fs.promises.writeFile(
            path.join(process.cwd(), "ECStasks", yaml),
            jsYaml.dump(task),
            "utf8",
          );
        } catch (e) {
          console.error(`Unable to write ${yaml}`);
          console.error(`Had hoped to write :\n`, task);
          throw e;
        }
        let compose;
        try {
          console.log(`Running ECS compose for ${name}`);
          let balancerCommand =
            targGroupARN ?
              `--target-groups "targetGroupArn=${targGroupARN},containerName=${name},containerPort=${port}"`
              : "";
          let composeCommand =
            `ecs-cli compose -f ${yaml} -p ${yaml.split(".")[0]} service up --ecs-profile ${useIAM} --cluster-config ${ECSName} --scheduling-strategy DAEMON `.concat(
              balancerCommand,
            );
          compose = exec(composeCommand, { cwd: path.join(process.cwd(), "ECStasks") });
        } catch (e) {
          console.error(`Failed to run ecs-cli compose service on ${yaml}`);
          throw e;
        }
        return compose;
      } else {
        console.log("Waiting for ECS to spool up...");
        setTimeout(wait, 10000);
      }
    };

    console.log(`Updated awsResources with ECS information`);
    try {
      let awsResources = jsYaml.load(
        fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
      );
      awsResources.ECSName = ECSName;
      fs.writeFileSync(
        path.join(process.cwd(), "awsResources.js"),
        jsYaml.dump(awsResources),
        "utf8",
      );
    } catch (e) {
      console.error(`Unable to update awsResources.js`);
      console.error(e);
    }

    console.log("Waiting for ECS cluster to start...");
    return await wait();
  };

  const rabbitPW = Math.random().toString();
  const rabbitUser = projName.replace(/[^A-Za-z0-9]/g, "");
  const rabbitCookie = uuid();
  const rabbitAddress = "amqp://"
    .concat(rabbitUser)
    .concat(":")
    .concat(rabbitPW)
    .concat("@localhost:5672");
  let myRabbitTask = JSON.parse(JSON.stringify(rabbitTask));
  myRabbitTask.services["message-queue"].environment.RABBITMQ_DEFAULT_USER = rabbitUser;
  myRabbitTask.services["message-queue"].environment.RABBITMQ_DEFAULT_PASS = rabbitPW;
  myRabbitTask.services["message-queue"].environment.RABBITMQ_ERLANG_COOKIE = rabbitCookie;
  myRabbitTask.services["message-queue"].logging.options["awslogs-group"] = `ecs/${projName}`;
  myRabbitTask.services["message-queue"].logging.options["awslogs-stream-prefix"] =
    `ecs/rabbit/${projName}`;
  apiTask.services["api"].environment.AMQP_ADDRESS = rabbitAddress;
  apiTask.services["api"].image = `${DHID}/api:latest`;
  apiTask.services["api"].logging.options["awslogs-group"] = `ecs/${projName}`;
  apiTask.services["api"].logging.options["awslogs-stream-prefix"] = `ecs/api/${projName}`;

  let docker_compose;
  try {
    docker_compose = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "pushkin/docker-compose.dev.yml"), "utf8"),
    );
  } catch (e) {
    console.error("Failed to load the docker-compose. That is extremely odd.");
    throw e;
  }

  let workerList = [];
  Object.keys(docker_compose.services).forEach((s) => {
    if (
      docker_compose.services[s].labels != null &&
      docker_compose.services[s].labels.isPushkinWorker
    ) {
      workerList.push(s);
    }
  });

  console.log(`ECS task creation waiting on DBs`);
  await completedDBs; //Next part won't run if DBs aren't done
  const dbInfoByTask = await getDBInfo();

  let composedRabbit;
  let composedAPI;
  let composedWorkers;
  composedRabbit = ecsCompose("rabbitTask.yml", myRabbitTask, "message-queue");
  composedRabbit = ecsCompose("apiTask.yml", apiTask, "api", 80, targGroupARN);
  composedWorkers = workerList.map((w) => {
    const yaml = w.concat(".yml");
    const name = w;
    let task = {};
    let expName = w.split("_worker")[0];
    task.version = workerTask.version;
    task.services = {};
    task.services[w] = workerTask.services["EXPERIMENT_NAME"];
    task.services[w].image = `${DHID}/${w}:latest`;
    task.services[w].logging.options["awslogs-group"] = `ecs/${projName}`;
    task.services[w].logging.options["awslogs-stream-prefix"] = `ecs/${w}/${projName}`;
    //Note that "DB_USER", "DB_NAME", "DB_PASS", "DB_URL" are redundant with "DB_SMARTURL"
    //For simplicity, newer versions of pushkin-worker will expect DB_SMARTURL
    //However, existing deploys won't have that. So both sets of information are maintained
    //for backwards compatibility, at least for the time being.
    task.services[w].environment = {
      AMQP_ADDRESS: rabbitAddress,
      DB_HOST: dbInfoByTask["Main"].endpoint,
      DB_USER: dbInfoByTask["Main"].username,
      DB_DB: dbInfoByTask["Main"].name,
      DB_PASS: dbInfoByTask["Main"].password,
      DB_URL: dbInfoByTask["Main"].endpoint,
      //"TRANS_URL": `postgres://${dbInfoByTask['Transaction'].username}:${dbInfoByTask['Transaction'].password}@${dbInfoByTask['Transaction'].endpoint}:/${dbInfoByTask['Transaction'].port}/${dbInfoByTask['Transaction'].name}`
      TRANS_HOST: dbInfoByTask["Transaction"].endpoint,
      TRANS_USER: dbInfoByTask["Transaction"].username,
      TRANS_DB: dbInfoByTask["Transaction"].name,
      TRANS_PASS: dbInfoByTask["Transaction"].password,
      TRANS_URL: dbInfoByTask["Transaction"].endpoint,
    };
    return ecsCompose(yaml, task, name);
  });

  return Promise.all([composedRabbit, composedAPI, composedWorkers]);
};

/**
 * Set up ECS cluster and related resources
 * @param {string} projName - The name of the project
 * @param {string} awsName - The name of the AWS account
 * @param {boolean} useIAM - Whether to use IAM roles
 * @param {string} DHID - The Docker Hub ID
 * @param {Promise} completedDBs - A promise that resolves when the databases are set up
 * @param {string} myCertificate - The certificate for the project
 * @returns {Promise} - A promise that resolves when the ECS setup is complete
 */
const setupECS = async (projName, awsName, useIAM, DHID, completedDBs, myCertificate) => {
  console.log(`Starting ECS setup`);
  let temp;

  /**
   * Create an SSH key pair
   * @param {boolean} useIAM - Whether to use IAM roles
   */
  const makeSSH = async (useIAM) => {
    let keyPairs;
    let foundPushkinKeyPair = false;
    try {
      const ec2Client = createEC2Client(useIAM);
      const describeKeyPairsResponse = await ec2Client.send(new DescribeKeyPairsCommand({}));
      keyPairs = { stdout: JSON.stringify({ KeyPairs: describeKeyPairsResponse.KeyPairs }) };
    } catch (e) {
      console.error(`Failed to get list of key pairs`);
    }
    JSON.parse(keyPairs.stdout).KeyPairs.forEach((k) => {
      if (k.KeyName == "my-pushkin-key-pair") {
        foundPushkinKeyPair = true;
      }
    });

    if (foundPushkinKeyPair) {
      console.log(`Pushkin key pair already exists. Skipping creation.`);
      return;
    } else {
      let keyPair;
      try {
        console.error(`Making SSH key`);
        const ec2Client = createEC2Client(useIAM);
        const createKeyPairResponse = await ec2Client.send(
          new CreateKeyPairCommand({
            KeyName: "my-pushkin-key-pair",
          }),
        );
        // Write the key material to file
        await require("fs").promises.writeFile("pushkinKey", createKeyPairResponse.KeyMaterial);
        await exec(`chmod 400 .pushkinKey`);
      } catch (e) {
        console.error(`Problem creating AWS SSH key`);
      }
      return;
    }
  };

  let madeSSH = makeSSH(useIAM);

  /**
   * make security group for load balancer. Start this process early, though it doesn't take super long.
   * @param {any} useIAM -- The IAM role to use
   * @param {string} projName -- The project name
   * @returns {Promise<string>} - The project name
   */
  const makeBalancerGroup = async (useIAM, projName) => {
    console.log(`Creating security group for load balancer`);
    let groupId;
    try {
      const ec2Client = createEC2Client(useIAM);

      // Create security group
      const createSGResponse = await ec2Client.send(
        new CreateSecurityGroupCommand({
          GroupName: "BalancerGroup",
          Description: "For the load balancer",
          TagSpecifications: [
            {
              ResourceType: "security-group",
              Tags: [
                {
                  Key: "PUSHKIN",
                  Value: projName,
                },
              ],
            },
          ],
        }),
      );
      groupId = createSGResponse.GroupId;

      // Add rules for HTTP and HTTPS
      await Promise.all([
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupName: "BalancerGroup",
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 80,
                ToPort: 80,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupName: "BalancerGroup",
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 443,
                ToPort: 443,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
      ]);
    } catch (e) {
      console.error(`Failed to create security group for load balancer`);
      throw e;
    }
    return groupId; //remember security group in order to use later!
  };

  let securityGroups;
  try {
    const ec2Client = createEC2Client(useIAM);
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    securityGroups = {
      stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
    };
  } catch (e) {
    console.error(`Failed to retrieve list of security groups from aws`);
    throw e;
  }
  let foundBalancerGroup = false;
  let madeBalancerGroup;
  let BalancerSecurityGroupID;
  JSON.parse(securityGroups.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == "BalancerGroup") {
      foundBalancerGroup = g.GroupId;
    }
  });
  if (foundBalancerGroup) {
    console.log(`Security group 'BalancerGroup' already exists. Skipping create.`);
    BalancerSecurityGroupID = foundBalancerGroup;
  } else {
    try {
      madeBalancerGroup = makeBalancerGroup(useIAM, projName); //start this process early. Will use much later.
    } catch (e) {
      throw e;
    }
  }

  //make security group for ECS cluster. Start this process early, though it doesn't take super long.
  /**
   *
   * @param useIAM
   * @param projName
   */
  const makeECSGroup = async (useIAM, projName) => {
    console.log(`Creating security group for ECS cluster`);
    let groupId;
    try {
      const ec2Client = createEC2Client(useIAM);

      const createSecurityGroupResponse = await ec2Client.send(
        new CreateSecurityGroupCommand({
          GroupName: "ECSGroup",
          Description: "For the ECS cluster",
          TagSpecifications: [
            {
              ResourceType: "security-group",
              Tags: [
                {
                  Key: "PUSHKIN",
                  Value: projName,
                },
              ],
            },
          ],
        }),
      );

      groupId = createSecurityGroupResponse.GroupId;

      // Add ingress rules
      await Promise.all([
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: groupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 80,
                ToPort: 80,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: groupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 22,
                ToPort: 22,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: groupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 1024,
                ToPort: 65535,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
      ]);
    } catch (e) {
      console.error(`Failed to create security group for ECS cluster`);
      throw e;
    }
    return groupId;
  };

  let ecsSecurityGroupID;
  let foundECSGroup = false;
  let madeECSGroup;
  JSON.parse(securityGroups.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == "ECSGroup") {
      foundECSGroup = g.GroupId;
    }
  });
  if (foundECSGroup) {
    console.log(`Security group 'foundECSGroup' already exists. Skipping create.`);
    ecsSecurityGroupID = foundECSGroup;
  } else {
    madeECSGroup = makeECSGroup(useIAM, projName); //start this process early. Will use much later.
  }

  //need one subnet per availability zone in region. Region is based on region for the profile.
  //Start this process early to use later.
  const foundSubnets = new Promise(async (resolve, reject) => {
    console.log(`Retrieving subnets for AWS zone`);
    try {
      const ec2Client = createEC2Client(useIAM);
      const describeSubnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({}));
      let subnets = {};
      describeSubnetsResponse.Subnets.forEach((subnet) => {
        subnets[subnet.AvailabilityZone] = subnet.SubnetId;
      });
      resolve(subnets);
    } catch (e) {
      console.error(`Failed to retrieve available subnets.`);
      reject(e);
    }
  });

  //CLI uses the default VPC by default. Retrieve the ID.
  /**
   *
   * @param useIAM
   */
  const getVPC = async (useIAM) => {
    console.log("getting default VPC");
    let describeVpcsResponse;
    try {
      const ec2Client = createEC2Client(useIAM);
      describeVpcsResponse = await ec2Client.send(new DescribeVpcsCommand({}));
    } catch (e) {
      console.error(`Unable to find VPC`);
      throw e;
    }
    let useVPC;
    describeVpcsResponse.Vpcs.forEach((v) => {
      if (v.IsDefault == true) {
        useVPC = v.VpcId;
      }
    });
    console.log("Default VPC: ", useVPC);
    return useVPC;
  };
  let gotVPC;
  try {
    gotVPC = getVPC(useIAM);
  } catch (e) {
    throw e;
  }

  let mkTaskDir;
  try {
    if (fs.existsSync(path.join(process.cwd(), "ECStasks"))) {
      //nothing
    } else {
      console.log("Making ECSTasks folder");
      await mkdir(path.join(process.cwd(), "ECStasks"));
    }
  } catch (e) {
    console.error(`Problem with ECSTasks folder`);
    throw e;
  }
  try {
    console.log(`Making ecs-params.yml`);
    // This lets us set the network mode for all services.
    // Currently that cannot be done through the task docker file
    let ecsParams = {
      version: 1,
      task_definition: {
        ecs_network_mode: "host",
      },
    };
    await fs.promises.writeFile(
      path.join(process.cwd(), "ECStasks/ecs-params.yml"),
      jsYaml.dump(ecsParams),
      "utf8",
    );
  } catch (e) {
    console.error(`Unable to create ecs-params.yml`);
    throw e;
  }

  //Everything past here requires the ECS CLI having been set up
  console.log("Configuring ECS CLI");
  let aws_access_key_id;
  let aws_secret_access_key;
  try {
    aws_access_key_id = execSync(
      `aws configure get aws_access_key_id --profile ${useIAM}`,
    ).toString();
    aws_secret_access_key = execSync(
      `aws configure get aws_secret_access_key --profile ${useIAM}`,
    ).toString();
  } catch (e) {
    console.error(
      `Unable to load AWS credentials for ${useIAM}. Are you sure you have this profile configured for the AWS CLI?`,
    );
    throw e;
  }

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");
  const setProfile =
    `ecs-cli configure profile --profile-name ${useIAM} --access-key ${aws_access_key_id} --secret-key ${aws_secret_access_key}`.replace(
      /(\r\n|\n|\r)/gm,
      " ",
    );
  let profileSet;
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    profileSet = await exec(setProfile);
  } catch (e) {
    console.error(`Unable to set up profile ${useIAM} for ECS CLI.`);
    throw e;
  }

  const nameCluster = `ecs-cli configure --region us-east-1 --cluster ${ECSName} --default-launch-type EC2 --config-name ${ECSName}`;
  const setDefaultCluster = `ecs-cli configure default --config-name ${ECSName}`;
  let clusterResults;
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    clusterResults = await exec(nameCluster);
    clusterResults = await exec(setDefaultCluster);
  } catch (e) {
    console.error(`Unable to set default cluster ${ECSName} for ECS CLI.`);
    throw e;
  }
  console.log(`ECS CLI configured`);

  let launchedECS;
  madeSSH = await madeSSH; //need this shortly
  console.log(`SSH set up`);
  const zones = await foundSubnets;
  console.log(`Subnets identified`);
  let subnets;
  try {
    subnets = Object.keys(zones).map((z) => zones[z]);
  } catch (e) {
    console.error(`Problem extracting list of subnets in your zone from 'zones': `, zones);
    throw e;
  }

  if (!ecsSecurityGroupID) {
    //If we didn't find one, we must be making it
    console.log("Waiting for ecsSecurityGroupID");
    ecsSecurityGroupID = await madeECSGroup;
  }
  const myVPC = await gotVPC;
  try {
    console.log("Launching ECS cluster");
    //Note that cluster is named here, although that should match the default anyway.
    const ecsCommand = `ecs-cli up --force --keypair my-pushkin-key-pair --capability-iam --ecs-profile ${useIAM} --size 1 --instance-type t2.small --cluster ${ECSName} --security-group ${ecsSecurityGroupID} --vpc ${myVPC} --subnets ${subnets.join(" ")}`;
    launchedECS = exec(ecsCommand);
  } catch (e) {
    console.error(`Unable to launch cluster ${ECSName}.`);
    throw e;
  }

  console.log(`Creating application load balancer`);
  if (!foundBalancerGroup) {
    BalancerSecurityGroupID = await madeBalancerGroup;
  }
  const loadBalancerName = ECSName.concat("Balancer");

  try {
    console.log(`Updating awsResources.js with load balancer info`);
    let awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
    awsResources.loadBalancerName = loadBalancerName;
    fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  let madeBalancer;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    madeBalancer = elbv2Client.send(
      new CreateLoadBalancerCommand({
        Name: loadBalancerName,
        Type: "application",
        Scheme: "internet-facing",
        Subnets: subnets,
        SecurityGroups: [BalancerSecurityGroupID],
        Tags: [{ Key: "PUSHKIN", Value: projName }],
      }),
    );
  } catch (e) {
    console.error(`Unable to create application load balancer`);
    throw e;
  }

  let tempMakeTargetGroup;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    tempMakeTargetGroup = await elbv2Client.send(
      new CreateTargetGroupCommand({
        Name: loadBalancerName.concat("Targets").slice(0, 32),
        Protocol: "HTTP",
        Port: 80,
        VpcId: myVPC,
      }),
    );
  } catch (e) {
    console.error(`Unable to create target group`);
    throw e;
  }
  const targGroupARN = tempMakeTargetGroup.TargetGroups[0].TargetGroupArn;
  try {
    console.log(`Updating awsResources.js with target group info`);
    let awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
    awsResources.targGroupARN = targGroupARN;
    fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  let aMadeBalancer = await madeBalancer; //need this for the next step
  const balancerARN = aMadeBalancer.LoadBalancers[0].LoadBalancerArn;
  const balancerEndpoint = aMadeBalancer.LoadBalancers[0].DNSName;
  const balancerZone = aMadeBalancer.LoadBalancers[0].CanonicalHostedZoneId;
  let madeListener;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    madeListener = await elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTP",
        Port: 80,
        DefaultActions: [
          {
            Type: "forward",
            TargetGroupArn: targGroupARN,
          },
        ],
      }),
    );
  } catch (e) {
    console.error(`Unable to create listener`);
    throw e;
  }

  let addedHTTPS;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    addedHTTPS = elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTPS",
        Port: 443,
        Certificates: [{ CertificateArn: myCertificate }],
        DefaultActions: [
          {
            Type: "forward",
            TargetGroupArn: targGroupARN,
          },
        ],
      }),
    );
    console.log(`Added HTTPS to load balancer`);
  } catch (e) {
    console.error(`Unable to add HTTPS to load balancer`);
    throw e;
  }

  await Promise.all([launchedECS, addedHTTPS]);
  console.log(`ECS cluster launched`);

  let createdECSTasks;
  try {
    console.log("Creating ECS tasks");
    createdECSTasks = ecsTaskCreator(
      projName,
      awsName,
      useIAM,
      DHID,
      completedDBs,
      ECSName,
      targGroupARN,
    );
  } catch (e) {
    throw e;
  }
  createdECSTasks = await createdECSTasks;
  console.log(`Created ECS task definitions`);

  return [balancerEndpoint, balancerZone];
};

/**
 *
 * @param configuredECS
 * @param useIAM
 * @param projName
 * @param myDomain
 * @param deployedFrontEnd
 */
const forwardAPIWrapper = async (configuredECS, useIAM, projName, myDomain, deployedFrontEnd) => {
  /**
   *
   * @param myDomain
   * @param useIAM
   * @param balancerEndpoint
   * @param balancerZone
   * @param projName
   */
  const forwardAPI = async (myDomain, useIAM, balancerEndpoint, balancerZone, projName) => {
    // This whole function can be skipped if not using custom domain
    // The API endpoint will have to be set manually
    if (myDomain != "default") {
      let temp;
      console.log(`Retrieving hostedzone ID for ${myDomain}`);
      let zoneID;
      try {
        const route53Client = createRoute53Client(useIAM);
        const listHostedZonesResponse = await route53Client.send(
          new ListHostedZonesByNameCommand({ DNSName: myDomain }),
        );
        temp = { stdout: JSON.stringify({ HostedZones: listHostedZonesResponse.HostedZones }) };
      } catch (e) {
        console.error(`Unable to retrieve hostedzone for ${myDomain}`);
        throw e;
      }
      if (JSON.parse(temp.stdout).HostedZones.length == 0) {
        console.error(`No hostedzone found for ${myDomain}`);
        throw new Error(`No hostedzone found for ${myDomain}`);
      }
      try {
        zoneID = JSON.parse(temp.stdout).HostedZones[0].Id.split("/hostedzone/")[1];
      } catch (e) {
        console.error(`Unable to parse hostedzone for ${myDomain}`);
        throw e;
      }

      // The following will update the resource records, creating them if they don't already exist

      console.log(`Updating record set for ${myDomain} in order to forward API`);
      let recordSet = {
        Comment: "",
        Changes: [],
      };
      recordSet.Changes[0] = JSON.parse(JSON.stringify(changeSet));

      recordSet.Changes[0].ResourceRecordSet.Name = "api.".concat(myDomain);
      recordSet.Changes[0].ResourceRecordSet.AliasTarget.DNSName = balancerEndpoint;
      recordSet.Changes[0].ResourceRecordSet.Type = "A";
      recordSet.Changes[0].ResourceRecordSet.AliasTarget.HostedZoneId = balancerZone;
      recordSet.Changes[0].ResourceRecordSet.SetIdentifier = projName;
      try {
        const route53Client = createRoute53Client(useIAM);
        await route53Client.send(
          new ChangeResourceRecordSetsCommand({
            HostedZoneId: zoneID,
            ChangeBatch: recordSet,
          }),
        );
        console.log(`Updated record set for ${myDomain}.`);
      } catch (e) {
        console.error(`Unable to create resource record set for ${myDomain}`);
        throw e;
      }
    }

    return true;
  };

  let balancerEndpoint;
  let balancerZone;
  [balancerEndpoint, balancerZone] = await configuredECS;
  await deployedFrontEnd; //We create a record set for the API during front-end setup, don't want to delete it now!
  let apiForwarded;
  try {
    apiForwarded = forwardAPI(myDomain, useIAM, balancerEndpoint, balancerZone, projName);
  } catch (e) {
    console.error(`Unable to set up forwarding for API`);
    throw e;
  }

  return apiForwarded;
};

/**
 * Handle security groups
 * @param {*} useIAM - The IAM role to use
 * @param {*} projName - The project name
 * @returns {Promise<string>} - The security group ID for the database group
 */
const handleSecurityGroups = async (useIAM, projName) => {
  /**
   * Create security group for databases
   * @param {*} useIAM - The IAM role to use
   * @param {*} projName - The project name
   * @returns {Promise<string>} - The security group ID for the database group
   */
  const createDatabaseGroup = async (useIAM, projName) => {
    const ec2Client = createEC2Client(useIAM);
    let stdOut;
    try {
      const createSGResponse = await ec2Client.send(
        new CreateSecurityGroupCommand({
          GroupName: "DatabaseGroup",
          Description: "For connecting to databases",
          TagSpecifications: [
            {
              ResourceType: "security-group",
              Tags: [{ Key: "PUSHKIN", Value: projName }],
            },
          ],
        }),
      );
      stdOut = { stdout: JSON.stringify({ GroupId: createSGResponse.GroupId }) };

      await ec2Client.send(
        new AuthorizeSecurityGroupIngressCommand({
          GroupName: "DatabaseGroup",
          IpPermissions: [
            {
              IpProtocol: "tcp",
              FromPort: 5432,
              ToPort: 5432,
              Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              IpRanges: [{ CidrIp: "0.0.0.0/0" }],
            },
          ],
        }),
      );
    } catch (e) {
      console.error(`Failed to create security group for databases`);
      throw e;
    }
    return JSON.parse(stdOut.stdout).GroupId; //remember security group in order to use later!
  };

  let temp;
  try {
    const ec2Client = createEC2Client(useIAM);
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    temp = {
      stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
    };
  } catch (e) {
    console.error(`Failed to retrieve list of security groups from aws`);
    throw e;
  }
  let foundDBGroup;
  JSON.parse(temp.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == "DatabaseGroup") {
      foundDBGroup = g.GroupId;
    }
  });

  return new Promise((resolve) => {
    if (foundDBGroup) {
      console.log(`Database security group already exists. Skipping creation.`);
      resolve(foundDBGroup);
    } else {
      console.log("Creating security group for databases");
      resolve(createDatabaseGroup(useIAM, projName));
    }
  });
};

/**
 * Record databases in pushkin.yaml
 * @param {*} dbDone - A promise that resolves when the databases are set up
 * @returns {Promise<object>} - The updated pushkin configuration
 */
const recordDBs = async (dbDone) => {
  const returnedPromises = await dbDone; //initializedTransactionsDB must be first in this list
  const transactionDB = returnedPromises[0]; //this is why it has to be first
  const mainDB = returnedPromises[1]; //this is why it has to be second

  console.log(`Databases created. Adding to local config definitions.`);
  let pushkinConfig;
  let stdOut;
  try {
    stdOut = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(stdOut);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }

  // Would have made sense for local databases and production databases to be nested within 'databases'
  // But poor planning prevents that. And we'd like to avoid breaking changes, so...
  if (pushkinConfig.productionDBs == null) {
    // initialize
    pushkinConfig.productionDBs = {};
  }
  if (transactionDB) {
    // false means it is preexisting, doesn't need to be updated
    pushkinConfig.productionDBs[transactionDB.type] = transactionDB;
  }
  if (mainDB) {
    // false means it is preexisting, doesn't need to be updated
    pushkinConfig.productionDBs[mainDB.type] = mainDB;
  }
  try {
    stdOut = await fs.promises.writeFile(
      path.join(process.cwd(), "pushkin.yaml"),
      jsYaml.dump(pushkinConfig),
      "utf8",
    );
    console.log(`Successfully updated pushkin.yaml with databases.`);
  } catch (e) {
    console.error(`Couldn't write updated pushkin.yaml`);
    throw e;
  }

  return pushkinConfig;
};

/**
 *
 * @param exp
 */
const rebuildWorker = async function (exp) {
  let pushkinConfig;
  let stdOut;
  try {
    stdOut = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(stdOut);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }
  console.log(`Rebuilding AWS-compatible worker for`, exp);
  const expDir = path.join(path.join(process.cwd(), pushkinConfig.experimentsDir), exp);
  if (!fs.lstatSync(expDir).isDirectory()) return "";
  let expConfig;
  try {
    expConfig = readConfig(expDir);
  } catch (err) {
    console.error(`Failed to read experiment config file for `.concat(exp));
    throw err;
  }
  const workerConfig = expConfig.worker;
  const workerName = `${exp}_worker`.toLowerCase(); //Docker names must all be lower case
  const workerLoc = path.join(expDir, workerConfig.location).replace(/ /g, "\\ "); //handle spaces in path

  let workerBuild;
  try {
    workerBuild = exec(
      `docker buildx build --platform linux/amd64 ${workerLoc} -t ${workerName} --load`,
    );
  } catch (e) {
    console.error(`Problem building worker for ${exp}`);
    throw e;
  }
  return workerBuild;
};

/**
 * Create CloudWatch log group for ECS
 * @param {*} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<void>} - A promise that resolves when the log group is created
 */
const createLogGroup = async (useIAM, projName) => {
  //Log group for ECS
  let stdOut;
  try {
    const cloudWatchLogsClient = createCloudWatchLogsClient(useIAM);
    await cloudWatchLogsClient.send(
      new CreateLogGroupCommand({
        logGroupName: `ecs/${projName}`,
      }),
    );
    stdOut = { stdout: "" };
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Log group ecs/${projName} for ECS already exists. Skipping creation.\n
      If this is a surprise, you should look into it.`,
      );
    } else {
      console.error(`Unable to create log group for ECS`);
      throw e;
    }
  }
  try {
    const cloudWatchLogsClient = createCloudWatchLogsClient(useIAM);
    await cloudWatchLogsClient.send(
      new PutRetentionPolicyCommand({
        logGroupName: `ecs/${projName}`,
        retentionInDays: 7,
      }),
    );
    stdOut = { stdout: "" };
  } catch (e) {
    console.error(`Unable to set retention policy for ECS log group`);
    throw e;
  }
};

/**
 * Handle database migrations
 * @param {Promise<object>} completedDBs - A promise that resolves to the completed databases
 * @returns {Promise<Map>} - A promise that resolves to a map of databases to their migration status
 */
const migrationsWrapper = async (completedDBs) => {
  console.log(`Handling main table migrations`);
  let dbsToExps, ranMigrations;
  let info = await completedDBs;
  try {
    dbsToExps = await getMigrations(path.join(process.cwd(), info.experimentsDir), true);
    ranMigrations = runMigrations(dbsToExps, info.productionDBs);
  } catch (e) {
    throw e;
  }
  return ranMigrations;
};

/**
 * Handle transaction table setup
 * @param completedDBs
 */
const setupTransactionsWrapper = async (completedDBs) => {
  let info = await completedDBs;
  let transMigrations = new Map();
  transMigrations.set("Transaction", [
    { migrations: path.join(process.cwd(), "coreMigrations"), seeds: "" },
  ]);
  let setupTransactionsTable;
  try {
    setupTransactionsTable = runMigrations(transMigrations, info.productionDBs);
  } catch (e) {
    throw e;
  }
  return setupTransactionsTable;
};

/**
 *
 * @param useIAM
 */
const chooseCertificate = async (useIAM) => {
  console.log("Setting up SSL for load-balancer");

  const acm = new ACMClient({
    region: myRegion,
    credentials: fromIni({ profile: useIAM }),
  });

  let certificates;
  try {
    const response = await acm.send(new ListCertificatesCommand({}));
    console.log(`Found ${response.CertificateSummaryList.length} total certificates`);

    // Show all certificates for debugging
    response.CertificateSummaryList.forEach((cert) => {
      console.log(
        `Certificate: ${cert.DomainName}, Status: ${cert.Status}, ARN: ${cert.CertificateArn}`,
      );
    });

    certificates = response.CertificateSummaryList.reduce((acc, c) => {
      acc[`${c.DomainName} (Status: ${c.Status})`] = c.CertificateArn;
      return acc;
    }, {});

    console.log(`Found ${Object.keys(certificates).length} total certificates`);
  } catch (e) {
    console.error(`Unable to get list of SSL certificates`);
    throw e;
  }

  console.log(`Choosing...`);
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "certificate",
      choices: Object.keys(certificates),
      default: 0,
      message:
        "Which SSL certificate would you like to use for your site? (Note: Only ISSUED certificates work for ALB)",
    },
  ]);

  return certificates[answers.certificate];
};

/**
 *
 * @param projName
 * @param awsName
 * @param useIAM
 * @param DHID
 */
export async function awsInit(projName, awsName, useIAM, DHID) {
  let temp;
  let pushkinConfig;
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(temp);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }

  let myCertificate;
  try {
    myCertificate = await chooseCertificate(useIAM); //Waiting because otherwise input query gets buried
  } catch (e) {
    console.error(`Unable to choose certificate.`);
    throw e;
  }

  console.log(`Looks good!`);
  // process.exit();

  /**
   *
   * @param useIAM
   */
  const chooseDomain = async (useIAM) => {
    console.log("Choosing domain name for site");
    let temp;
    try {
      const route53DomainsClient = createRoute53DomainsClient(useIAM);
      const listDomainsResponse = await route53DomainsClient.send(new ListDomainsCommand({}));
      temp = { stdout: JSON.stringify({ Domains: listDomainsResponse.Domains }) };
    } catch (e) {
      console.error(`Unable to get list of SSL certificates`);
    }
    let domains = ["default"];
    JSON.parse(temp.stdout).Domains.forEach((c) => {
      domains.push(c.DomainName);
    });

    return new Promise((resolve, reject) => {
      console.log(`Choosing...`);
      inquirer
        .prompt([
          {
            type: "list",
            name: "domain",
            choices: domains,
            default: 0,
            message: "Which domain would you like to use for your site?",
          },
        ])
        .then((answers) => {
          resolve(answers.domain);
        });
    });
  };
  let myDomain;
  try {
    myDomain = await chooseDomain(useIAM); //Waiting because otherwise input query gets buried
  } catch (e) {
    throw e;
  }

  pushkinConfig.info.rootDomain = myDomain;
  pushkinConfig.info.projName = projName;
  pushkinConfig.info.awsName = awsName;
  try {
    await fs.promises.writeFile(
      path.join(process.cwd(), "pushkin.yaml"),
      jsYaml.dump(pushkinConfig),
      "utf8",
    );
    console.log(`Successfully updated pushkin.yaml with custom domain.`);
    updatePushkinJs();
  } catch (e) {
    throw e;
  }

  //Databases take BY FAR the longest, so start them right after certificate (certificate comes first or things get confused)
  let securityGroupID = await handleSecurityGroups(useIAM, projName);

  let initializedMainDB;
  try {
    initializedMainDB = initDB("Main", securityGroupID, projName, awsName, useIAM);
  } catch (e) {
    console.error(`Failed to initialize main database`);
    throw e;
  }

  let initializedTransactionDB;
  try {
    initializedTransactionDB = initDB("Transaction", securityGroupID, projName, awsName, useIAM);
  } catch (e) {
    console.error(`Failed to initialize transaction database`);
    throw e;
  }

  const completedDBs = recordDBs(Promise.all([initializedMainDB, initializedTransactionDB]));

  const expDirs = fs.readdirSync(path.join(process.cwd(), pushkinConfig.experimentsDir));
  let rebuiltWorkers;
  try {
    rebuiltWorkers = Promise.all(expDirs.map(rebuildWorker));
  } catch (err) {
    console.error(err);
    throw err;
  }

  const createdLogGroups = createLogGroup(useIAM, projName);

  //pushing stuff to DockerHub
  let publishedToDocker;
  try {
    publishedToDocker = publishToDocker(DHID, rebuiltWorkers);
  } catch (e) {
    console.error("Unable to publish images to DockerHub");
    throw e;
  }

  //build front-end
  let builtFrontEnd;
  try {
    builtFrontEnd = buildFE(projName);
  } catch (e) {
    throw e;
  }

  let deployedFrontEnd;
  try {
    deployedFrontEnd = deployFrontEnd(
      projName,
      awsName,
      useIAM,
      myDomain,
      myCertificate,
      builtFrontEnd,
    );
  } catch (e) {
    console.error(`Failed to deploy front end`);
    throw e;
  }

  publishedToDocker = await publishedToDocker; //need this to configure ECS
  let configuredECS;
  try {
    configuredECS = setupECS(projName, awsName, useIAM, DHID, completedDBs, myCertificate);
  } catch (e) {
    throw e;
  }

  let setupTransactionsTable;
  try {
    setupTransactionsTable = setupTransactionsWrapper(completedDBs);
  } catch (e) {
    console.error(`Unable to run migrations for transactions DB`);
    throw e;
  }

  let ranMigrations;
  try {
    ranMigrations = migrationsWrapper(completedDBs);
  } catch (e) {
    throw e;
  }

  let apiForwarded;
  try {
    apiForwarded = forwardAPIWrapper(configuredECS, useIAM, projName, myDomain, deployedFrontEnd);
  } catch (e) {
    throw e;
  }

  // This needs to come last, right before 'return'
  if (myDomain == "default") {
    let configuredECSoutput = await configuredECS;
    let cloudDomain = await deployedFrontEnd; //has actually already resolved, but not sure I can use it directly
    console.log(`Access your website at ${cloudDomain}`);
    console.log(
      `Be sure to update pushkin/front-end/src/config.js so that the api URL is ${configuredECSoutput[0]}.`,
    );
    pushkinConfig.info.rootDomain = cloudDomain;
  }

  pushkinConfig = await completedDBs;

  await Promise.all([deployedFrontEnd, setupTransactionsTable, ranMigrations, apiForwarded]);

  await fs.promises.writeFile(
    path.join(process.cwd(), "pushkin.yaml"),
    jsYaml.dump(pushkinConfig),
    "utf8",
  );

  return;
}

/**
 *
 * @param projName
 */
export async function nameProject(projName) {
  console.log(`Recording project name`);
  let awsResources = {};
  let stdOut, temp, pushkinConfig;
  awsResources.name = projName;
  // make a name for use as a bucket (AWS has rules)
  temp = projName
    .replace(/[^\w\s]/g, "")
    .replace(/ /g, "-")
    .replace(/_/g, "-")
    .concat(uuid())
    .toLowerCase();
  if (temp.search(/[a-zA-Z]/g) != 0) {
    temp = "p".concat(temp);
  }
  awsResources.awsName = temp;
  //use regular expressions to remove underscores from project name
  try {
    stdOut = fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(
      `Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }

  console.log("Resetting db info");
  try {
    pushkinConfig = jsYaml.load(fs.readFileSync(path.join(process.cwd(), "pushkin.yaml"), "utf8"));
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }

  if (pushkinConfig.productionDbs) {
    Object.keys(pushkinConfig.productionDBs).forEach((db) => {
      pushkinConfig.productionDBs[db].name = null;
      pushkinConfig.productionDBs[db].host = null;
      pushkinConfig.productionDBs[db].pass = null;
      // Leave port and user in place, since those are unlikely to change
    });
    try {
      fs.promises.writeFile(
        path.join(process.cwd(), "pushkin.yaml"),
        jsYaml.dump(pushkinConfig),
        "utf8",
      );
    } catch (e) {
      console.error(`Couldn't save pushkin.yaml`);
      throw e;
    }
  }

  return awsResources.awsName;
}

/**
 *
 * @param useIAM
 */
const makeACL = async (useIAM) => {
  //This function first checks for an ACL named pushkinACL. If so, return ARN.
  //If not, create one and return the ARN.
  //We don't store anything because the ACL is always called 'pushkinACL' and the ID and ARN can always be looked up if needed.
  /**
   *
   * @param useIAM
   */
  const findACL = async (useIAM) => {
    let ACLarn;
    let temp;
    try {
      const wafv2Client = createWAFv2Client(useIAM);
      const listWebACLsResponse = await wafv2Client.send(
        new ListWebACLsCommand({ Scope: "CLOUDFRONT" }),
      );
      temp = { stdout: JSON.stringify({ WebACLs: listWebACLsResponse.WebACLs }) };
    } catch (e) {
      console.error(`Unable to get list of ACLs`);
      throw e;
    }
    if (temp.stdout != "") {
      JSON.parse(temp.stdout).WebACLs.forEach((d) => {
        let tempCheck = false;
        try {
          tempCheck = d.Name == "pushkinACL";
        } catch (e) {
          console.warn("\x1b[31m%s\x1b[0m", `Problem reading ACL list.`);
          throw e;
        }
        if (tempCheck) {
          ACLarn = d.ARN;
        }
      });
    }
    return ACLarn;
  };

  let ACLarn = await findACL(useIAM);
  if (!ACLarn) {
    let temp;
    try {
      const wafv2Client = createWAFv2Client(useIAM);
      const createWebACLResponse = await wafv2Client.send(
        new CreateWebACLCommand({
          Name: "pushkinACL",
          Scope: "CLOUDFRONT",
          DefaultAction: { Allow: {} },
          Rules: pushkinACL.Rules,
          VisibilityConfig: pushkinACL.VisibilityConfig,
        }),
      );
      temp = { stdout: JSON.stringify({ Summary: createWebACLResponse.Summary }) };
    } catch (e) {
      console.error(`Unable to create ACL`);
      throw e;
    }
    ACLarn = JSON.parse(temp.stdout).Summary.ACLarn;
  }
  console.log(`ACL created`);
  return ACLarn;
};

/**
 *
 * @param iam
 */
export async function addIAM(iam) {
  let temp;
  let awsResources;
  try {
    awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
  } catch (e) {
    console.error(
      `Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }
  awsResources.iam = iam;
  try {
    fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(
      `Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }
  return;
}

/**
 *
 * @param useIAM
 * @param killTag
 */
const deleteStack = async (useIAM, killTag) => {
  console.log(`Deleting cloudformation stacks`);
  /**
   *
   * @param stackType
   */
  const getStackList = async (stackType) => {
    let stacksToDelete = [];
    let stackList;
    try {
      const cloudFormationClient = createCloudFormationClient(useIAM);
      const listStacksResponse = await cloudFormationClient.send(new ListStacksCommand({}));
      stackList = { stdout: JSON.stringify({ StackSummaries: listStacksResponse.StackSummaries }) };
    } catch (e) {
      console.error(`Unable to list cloudformation stacks`);
      throw e;
    }
    if (JSON.parse(stackList.stdout).StackSummaries) {
      JSON.parse(stackList.stdout).StackSummaries.forEach((s) => {
        if (stackType == "deletable") {
          if ((s.StackStatus == "Active") | (s.StackStatus == "CREATE_COMPLETE")) {
            if (killTag && s.Tags.length > 0) {
              if (s.Tags[0].Value == killTag) {
                stacksToDelete.push(s.StackId);
              }
            } else {
              stacksToDelete.push(s.StackId);
            }
          }
        }
        if (stackType == "alive") {
          if (s.StackStatus != "DELETE_COMPLETE") {
            if (killTag && s.Tags.length > 0) {
              if (s.Tags[0].Value == killTag) {
                stacksToDelete.push(s.StackId);
              }
            } else {
              stacksToDelete.push(s.StackId);
            }
          }
        }
      });
    }
    return stacksToDelete;
  };

  let stacksToDelete;
  try {
    stacksToDelete = await getStackList("deletable");
  } catch (e) {
    throw e;
  }

  return new Promise(async (resolve, reject) => {
    if (stacksToDelete.length > 0) {
      stacksToDelete.map(async (s) => {
        console.log(`Deleting stack ${s}`);
        try {
          const cloudFormationClient = createCloudFormationClient(useIAM);
          return await cloudFormationClient.send(new DeleteStackCommand({ StackName: s }));
        } catch (e) {
          console.warn(
            "\x1b[31m%s\x1b[0m",
            `Unable to find cloudformation stack ${s}. May have already been deleted. Skipping.`,
          );
          return true;
        }
      });

      /**
       *
       */
      const awaitStacks = async () => {
        let remainingStacks = [];
        try {
          remainingStacks = await getStackList("alive");
        } catch (e) {
          throw e;
        }
        if (remainingStacks.length > 0) {
          setTimeout(awaitStacks, 5000);
        } else {
          resolve(true);
        }
      };
      try {
        awaitStacks();
      } catch (e) {
        throw e;
      }
    } else {
      resolve(true);
    }
  });
};

/**
 *
 * @param deletedStack
 * @param useIAM
 * @param killTag
 * @param projName
 * @param awsResources
 */
const deleteCluster = async (deletedStack, useIAM, killTag, projName, awsResources) => {
  deletedStack = await deletedStack; //probably need this gone first.
  console.log(`Deleted stack: ${deletedStack}`);
  let runningClusters = [];
  let clustersToKill = [];
  let temp;
  try {
    const ecsClient = createECSClient(useIAM);
    const listClustersResponse = await ecsClient.send(new ListClustersCommand({}));
    temp = { stdout: JSON.stringify({ clusterArns: listClustersResponse.clusterArns }) };
  } catch (e) {
    console.error(`Unable to list ECS clusters.\n` + e);
    throw e;
  }
  if (JSON.parse(temp.stdout).clusterArns.length > 0) {
    JSON.parse(temp.stdout).clusterArns.map((c) => {
      runningClusters.push(c);
    });
  }

  if (!killTag) {
    clustersToKill = runningClusters;
  } else {
    console.warn(
      "\x1b[31m%s\x1b[0m",
      `Only nuking clusters associated with this project. Full list of clusters includes:`,
    );
    console.warn("\x1b[31m%s\x1b[0m", runningClusters);
    if (awsResources && !awsResources.ECSName) {
      awsResources.ECSName = projName.replace(/[^A-Za-z0-9]/g, ""); //won't be permanent. Doesn't matter.
    }
    let clusterDescription;
    try {
      const ecsClient = createECSClient(useIAM);
      const describeClustersResponse = await ecsClient.send(
        new DescribeClustersCommand({
          clusters: [awsResources.ECSName],
        }),
      );
      clusterDescription = {
        stdout: JSON.stringify({ clusters: describeClustersResponse.clusters }),
      };
    } catch (e) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`,
      );
      awsResources.ECSName = null;
      return true;
    }
    if (JSON.parse(clusterDescription.stdout).clusters.length == 0) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`,
      );
      awsResources.ECSName = null;
      return true;
    } else {
      JSON.parse(clusterDescription.stdout).clusters.forEach((c) => {
        if (c.clusterName == awsResources.ECSName) {
          clustersToKill.push(c.clusterArn);
        }
      });
      if (clustersToKill.length == 0) {
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`,
        );
        awsResources.ECSName = null;
        return true;
      }
    }
  }
  console.log(`Deleting these ECS clusters: ` + clustersToKill.join(", "));

  console.log(`Stopping ECS services.`);
  await Promise.all(
    clustersToKill.map(async (c) => {
      let aTaskToKill;
      try {
        const ecsClient = createECSClient(useIAM);
        const listTasksResponse = await ecsClient.send(
          new ListTasksCommand({
            cluster: c,
          }),
        );
        aTaskToKill = { stdout: JSON.stringify({ taskArns: listTasksResponse.taskArns }) };
      } catch (e) {
        console.error(`Unable to list tasks for cluster ${c}.`);
        throw e;
      }
      let tasksToKill = JSON.parse(aTaskToKill.stdout).taskArns;
      let killedTasks;
      if (tasksToKill.length > 0) {
        killedTasks = Promise.all(
          tasksToKill.map(async (t) => {
            console.log(`killing task: ` + t);
            const ecsClient = createECSClient(useIAM);
            return await ecsClient.send(
              new StopTaskCommand({
                cluster: c,
                task: t,
              }),
            );
          }),
        );
      }
      killedTasks = await killedTasks;

      //wait for tasks to stop
      while (true) {
        let aTaskToKill;
        try {
          const ecsClient = createECSClient(useIAM);
          const listTasksResponse = await ecsClient.send(
            new ListTasksCommand({
              cluster: c,
            }),
          );
          aTaskToKill = { stdout: JSON.stringify({ taskArns: listTasksResponse.taskArns }) };
        } catch (e) {
          console.error(`Unable to list tasks for cluster ${c}.`);
          throw e;
        }

        tasksToKill = JSON.parse(aTaskToKill.stdout).taskArns;

        if (tasksToKill.length === 0) {
          console.log("All tasks have stopped.");
          break;
        }

        console.log(`Waiting for ${tasksToKill.length} tasks to stop...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      /**
       *
       * @param clusterName
       * @param useIAM
       */
      async function deleteAllServices(clusterName, useIAM) {
        let servicesToDelete = [];
        let deletedServices = [];
        let aServiceToDelete;

        try {
          const ecsClient = createECSClient(useIAM);
          const listServicesResponse = await ecsClient.send(
            new ListServicesCommand({
              cluster: clusterName,
            }),
          );
          aServiceToDelete = {
            stdout: JSON.stringify({ serviceArns: listServicesResponse.serviceArns }),
          };
        } catch (e) {
          console.error(`Unable to list services for cluster ${clusterName}.`);
          throw e;
        }

        servicesToDelete = JSON.parse(aServiceToDelete.stdout).serviceArns;

        if (servicesToDelete.length > 0) {
          deletedServices = Promise.all(
            servicesToDelete.map(async (s) => {
              console.log(`deleting service: ` + s);
              const ecsClient = createECSClient(useIAM);
              return await ecsClient.send(
                new DeleteServiceCommand({
                  cluster: clusterName,
                  service: s,
                  force: true,
                }),
              );
            }),
          );
        }

        await deletedServices;
        // Wait for services to be deleted
        while (true) {
          let servicesList;
          try {
            const ecsClient = createECSClient(useIAM);
            const listServicesResponse = await ecsClient.send(
              new ListServicesCommand({
                cluster: clusterName,
              }),
            );
            servicesList = {
              stdout: JSON.stringify({ serviceArns: listServicesResponse.serviceArns }),
            };
          } catch (e) {
            console.error(`Unable to list services for cluster ${clusterName}.`);
            throw e;
          }

          servicesToDelete = JSON.parse(servicesList.stdout).serviceArns;

          if (servicesToDelete.length === 0) {
            console.log("All services have been deleted.");
            break;
          }

          console.log(`Waiting for ${servicesToDelete.length} services to be deleted...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        console.log("All services have been deleted.");
        return true;
      }

      return deleteAllServices(c, useIAM);
    }),
  );
  let killedClusters = clustersToKill.map(async (c) => {
    console.log(`Deleting ECS Cluster ${c}.`);
    try {
      const ecsClient = createECSClient(useIAM);
      temp = await ecsClient.send(
        new DeleteClusterCommand({
          cluster: c,
        }),
      );
    } catch (e) {
      console.error(`Unable to delete cluster ${c}.`);
      console.error(e);
    }
    return temp;
  });
  return killedClusters;
};

/**
 *
 * @param useIAM
 * @param killTag
 * @param awsResources
 */
const dbsToDeleteFunc = async (useIAM, killTag, awsResources) => {
  // Get list of DBs to delete
  let dbs = [];
  let respDBList;
  try {
    const rdsClient = createRDSClient(useIAM);
    const describeDBInstancesResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));
    respDBList = {
      stdout: JSON.stringify({ DBInstances: describeDBInstancesResponse.DBInstances }),
    };
  } catch (e) {
    console.error(`Unable to list databases`);
    throw e;
  }
  JSON.parse(respDBList.stdout).DBInstances.forEach((db) => {
    if (!killTag) {
      //kill them all
      dbs.push(db.DBInstanceIdentifier);
    } else {
      if (db.TagList.length > 0) {
        db.TagList.forEach((tag) => {
          if ((tag.Key == "PUSHKIN") & (tag.Value == killTag)) {
            dbs.push(db.DBInstanceIdentifier);
          }
        });
      }
    }
  });
  return dbs;
};

/**
 *
 * @param dbs
 * @param useIAM
 * @param killTag
 */
const deleteDatabases = async (dbs, useIAM, killTag) => {
  dbs = await dbs;

  if (dbs.length == 0) {
    console.log(`No databases to delete.`);
    return true;
  }
  console.log(`Removing deletion protection from databases ${dbs}.`);
  await Promise.all(
    dbs.map(async (db) => {
      let temp;
      try {
        const rdsClient = createRDSClient(useIAM);
        const describeDBInstancesResponse = await rdsClient.send(
          new DescribeDBInstancesCommand({ DBInstanceIdentifier: db }),
        );
        temp = Buffer.from(
          JSON.stringify({ DBInstances: describeDBInstancesResponse.DBInstances }),
        );
      } catch (e) {
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Unable to find database ${db}. Possibly it was already deleted.`,
        );
        /**
         *
         * @param x
         */
        let tempFunc = (x) => {
          return x.filter((d) => {
            return d != db;
          }); // remove from list
        };
        dbs = tempFunc(dbs);
        return;
      }
      const rdsClient = createRDSClient(useIAM);
      await rdsClient.send(
        new ModifyDBInstanceCommand({
          DBInstanceIdentifier: db,
          DeletionProtection: false,
          ApplyImmediately: true,
        }),
      );
    }),
  );

  console.log(`Deleting databases`);

  /**
   *
   * @param dbId
   */
  const checkDatabases = async (dbId) => {
    let temp;
    console.log(`Checking database ${dbId} for deletion protection`);
    try {
      const rdsClient = createRDSClient(useIAM);
      const describeDBInstancesResponse = await rdsClient.send(
        new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbId }),
      );
      temp = JSON.stringify({ DBInstances: describeDBInstancesResponse.DBInstances });
    } catch (e) {
      console.error(
        `Unable to get information for db ${dbId}. Possibly it was already deleted. Skipping`,
      );
      return;
    }
    if (temp != "") {
      return JSON.parse(temp).DBInstances[0].DeletionProtection == false;
    } else {
      return false;
    }
  };

  /**
   *
   */
  const wait = async () => {
    //Sometimes, I really miss loops
    let checked = dbs.map((db) => {
      checkDatabases(db);
    });
    if (checked.includes(false)) {
      console.log("Waiting for DBs to be deletable...");
      setTimeout(wait, 20000);
    } else {
      return Promise.all([
        dbs.map(async (db) => {
          //check whether DB is already being deleted
          let dbStatus;
          try {
            const rdsClient = createRDSClient(useIAM);
            const describeDBInstancesResponse = await rdsClient.send(
              new DescribeDBInstancesCommand({ DBInstanceIdentifier: db }),
            );
            dbStatus = {
              stdout: JSON.stringify({ DBInstances: describeDBInstancesResponse.DBInstances }),
            };
          } catch (e) {
            console.error(`Unable to get information about ${db}`);
            console.error(e);
          }
          if (JSON.parse(dbStatus.stdout).DBInstances[0].DBInstanceStatus != "deleting") {
            let dbDeletionResponse;
            console.log(`Deleting database ${db}`);
            try {
              const rdsClient = createRDSClient(useIAM);
              dbDeletionResponse = rdsClient.send(
                new DeleteDBInstanceCommand({
                  DBInstanceIdentifier: db,
                  SkipFinalSnapshot: true,
                }),
              );
            } catch (e) {
              if (e.message.includes("already being deleted")) {
                console.warn("\x1b[31m%s\x1b[0m", `Database ${db} already being deleted.`);
                return true;
              } else {
                console.error(`Uncaught db deletion error: ` + e);
                throw e;
              }
            }
          }
        }),
      ]);
    }
    console.log("really shouldn't ever get to this line of wait()!");
  };

  try {
    await wait();
  } catch (e) {
    throw e;
  }

  //now, wait for them to be deleted
  /**
   *
   */
  const wait2 = async () => {
    //Sometimes, I really miss loops
    return new Promise(async (resolve, reject) => {
      /**
       *
       */
      const confirmDBDeleted = async () => {
        let temp;
        try {
          const rdsClient = createRDSClient(useIAM);
          const describeDBInstancesResponse = await rdsClient.send(
            new DescribeDBInstancesCommand({}),
          );
          temp = JSON.stringify({ DBInstances: describeDBInstancesResponse.DBInstances });
        } catch (e) {
          console.error(`Unable to get list of databases`);
          throw e;
        }
        return JSON.parse(temp).DBInstances.length == 0;
      };
      let confirmedDeleted;
      try {
        confirmedDeleted = await confirmDBDeleted();
      } catch (e) {
        throw e;
      }
      if (confirmedDeleted) {
        console.log(`Databases confirmed deleted`);
        resolve(true);
      } else {
        console.log("Waiting for DBs to be deleted...");
        setTimeout(wait2, 20000);
      }
      //console.log("really shouldn't ever get to this line of wait2()!")
    });
  };

  return wait2();
};

/**
 *
 * @param useIAM
 * @param killTag
 */
const deleteLoadBalancer = async (useIAM, killTag) => {
  //FUBAR Need to killize this
  let temp;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    const describeLoadBalancersResponse = await elbv2Client.send(
      new DescribeLoadBalancersCommand({}),
    );
    temp = {
      stdout: JSON.stringify({ LoadBalancers: describeLoadBalancersResponse.LoadBalancers }),
    };
  } catch (e) {
    console.warn(
      "\x1b[31m%s\x1b[0m",
      `Unable to find any load balancers. May have already been deleted. Skipping.`,
    );
    return;
  }
  let balancersToDelete = [];
  JSON.parse(temp.stdout).LoadBalancers.forEach((l) => {
    balancersToDelete.push(l.LoadBalancerArn);
  });
  return Promise.all(
    balancersToDelete.map(async (b) => {
      console.log(`Deleting load balancer ${b}`);
      /**
       *
       * @param loadBalancerName
       * @param useIAM
       */
      async function deleteAllListeners(loadBalancerName, useIAM) {
        let listenersToDelete = [];
        let deletedListeners = [];
        let temp;

        try {
          const elbv2Client = createELBv2Client(useIAM);
          const describeListenersResponse = await elbv2Client.send(
            new DescribeListenersCommand({ LoadBalancerArn: loadBalancerName }),
          );
          temp = { stdout: JSON.stringify({ Listeners: describeListenersResponse.Listeners }) };
        } catch (e) {
          console.error(`Unable to list listeners for load balancer ${loadBalancerName}.`);
          throw e;
        }

        listenersToDelete = JSON.parse(temp.stdout).Listeners.map((l) => l.ListenerArn);

        if (listenersToDelete.length > 0) {
          const elbv2Client = createELBv2Client(useIAM);
          deletedListeners = Promise.all(
            listenersToDelete.map(async (l) => {
              console.log(`deleting listener: ` + l);
              return await elbv2Client.send(new DeleteListenerCommand({ ListenerArn: l }));
            }),
          );
        }

        if (deletedListeners.length > 0) {
          await deletedListeners;
        }

        // Wait for listeners to be deleted
        while (true) {
          let describedListeners;
          try {
            const elbv2Client = createELBv2Client(useIAM);
            const describeListenersResponse = await elbv2Client.send(
              new DescribeListenersCommand({ LoadBalancerArn: loadBalancerName }),
            );
            describedListeners = {
              stdout: JSON.stringify({ Listeners: describeListenersResponse.Listeners }),
            };
          } catch (e) {
            console.error(`Unable to list listeners for load balancer ${loadBalancerName}.`);
            throw e;
          }

          listenersToDelete = JSON.parse(describedListeners.stdout).Listeners.map(
            (l) => l.ListenerArn,
          );

          if (listenersToDelete.length === 0) {
            console.log("All listeners have been deleted.");
            break;
          }

          console.log(`Waiting for ${listenersToDelete.length} listeners to be deleted...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        return true;
      }

      await deleteAllListeners(b, useIAM);

      let deletedLoadBalancer;
      try {
        const elbv2Client = createELBv2Client(useIAM);
        deletedLoadBalancer = await elbv2Client.send(
          new DeleteLoadBalancerCommand({ LoadBalancerArn: b }),
        );
      } catch (e) {
        console.error(`Unable to delete load balancer ${b}`);
        console.error(e);
      }
    }),
  );

  return true;
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
    const cloudFrontClient = createCloudFrontClient(useIAM);
    const listDistributionsResponse = await cloudFrontClient.send(new ListDistributionsCommand({}));
    tempDists = {
      stdout: JSON.stringify({ DistributionList: listDistributionsResponse.DistributionList }),
    };
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`);
    throw e;
  }
  const parsedDists = JSON.parse(tempDists.stdout);
  if (!parsedDists.DistributionList || !parsedDists.DistributionList.Items || parsedDists.DistributionList.Items.length === 0) {
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
          const cloudFrontClient = createCloudFrontClient(useIAM);
          const listTagsResponse = await cloudFrontClient.send(
            new ListTagsForResourceCommand({ Resource: d.ARN }),
          );
          tempTagCheck = JSON.stringify({ Tags: listTagsResponse.Tags });
        } catch (e) {
          console.error(`Unable to get tags for cloudfront distribution ${d.ARN}`);
          throw e;
        }
        JSON.parse(tempTagCheck).Tags.forEach((t) => {
          if ((t.Key == "PUSHKIN") & (t.Value == projName)) {
            distributions.push(d.Id);
          }
        });
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
        const cloudFrontClient = createCloudFrontClient(useIAM);
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
          const cloudFrontClient = createCloudFrontClient(useIAM);
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

        // disableCloudfront.Enabled = false
        // disableCloudfront.CallerReference = cloudConfig.CallerReference
        // disableCloudfront.Origins.Items[0].Id = cloudConfig.Origins.Items[0].Id
        // disableCloudfront.Origins.Items[0].DomainName = cloudConfig.Origins.Items[0].DomainName
        // disableCloudfront.Origins.Items[0].DomainName = cloudConfig.Origins.Items[0].DomainName
        // disableCloudfront.DefaultCacheBehavior.TargetOriginId = cloudConfig.DefaultCacheBehavior.TargetOriginId
        cloudConfig.Enabled = false; //This is the only thing to update
        console.log(`Disabling cloudfront distribution ` + distId);

        let disableCloudFront;
        try {
          const cloudFrontClient = createCloudFrontClient(useIAM);
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
                const cloudFrontClient = createCloudFrontClient(useIAM);
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
                const cloudFrontClient = createCloudFrontClient(useIAM);
                await cloudFrontClient.send(
                  new DeleteDistributionCommand({ Id: distId, IfMatch: ETag }),
                );
              } catch (e) {
                console.error(`Unable to delete cloudfront distribution`);
                try {
                  const cloudFrontClient = createCloudFrontClient(useIAM);
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
 * @param killTag
 * @param projName
 */
const deleteResourceRecords = async (useIAM, killTag, projName) => {
  let temp;
  let pushkinConfig;
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(temp);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }
  let myDomain = pushkinConfig.info.rootDomain;

  console.log(`Deleting resource records for ${myDomain}`);

  let zoneID;
  let listedHostedZones;
  try {
    const route53Client = createRoute53Client(useIAM);
    const listHostedZonesResponse = await route53Client.send(
      new ListHostedZonesByNameCommand({ DNSName: myDomain }),
    );
    listedHostedZones = {
      stdout: JSON.stringify({ HostedZones: listHostedZonesResponse.HostedZones }),
    };
  } catch (e) {
    console.error(`Unable to retrieve hostedzone for ${myDomain}`);
    throw e;
  }
  if (JSON.parse(listedHostedZones.stdout).HostedZones.length == 0) {
    console.warn(`No hostedzone found for ${myDomain}`);
    //skip deleting resource records
    return true;
  }
  try {
    zoneID = JSON.parse(listedHostedZones.stdout).HostedZones[0].Id.split("/hostedzone/")[1];
  } catch (e) {
    console.error(`Unable to parse hostedzone for ${myDomain}`);
    throw e;
  }

  let resourceRecords = {
    HostedZoneId: zoneID,
    ChangeBatch: {
      Comment: "",
      Changes: [],
    },
  };

  let tempRRList;
  try {
    const route53Client = createRoute53Client(useIAM);
    const listResourceRecordSetsResponse = await route53Client.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }),
    );
    tempRRList = {
      stdout: JSON.stringify({
        ResourceRecordSets: listResourceRecordSetsResponse.ResourceRecordSets,
      }),
    };
  } catch (e) {
    console.error(`Unable to retrieve resource records for ${myDomain}`);
    throw e;
  }
  JSON.parse(tempRRList.stdout).ResourceRecordSets.forEach((rr) => {
    if ((rr.SetIdentifier == projName) | (!killTag & rr.SetIdentifier)) {
      let recordSet = {
        Action: "DELETE",
        ResourceRecordSet: rr,
      };
      resourceRecords.ChangeBatch.Changes.push(recordSet);
    }
  });
  if (resourceRecords.ChangeBatch.Changes.length > 0) {
    const route53Client = createRoute53Client(useIAM);
    return route53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: resourceRecords.HostedZoneId,
        ChangeBatch: resourceRecords.ChangeBatch,
      }),
    );
  } else {
    return true;
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
  let temp;
  try {
    const cloudFrontClient = createCloudFrontClient(useIAM);
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
        const cloudFrontClient = createCloudFrontClient(useIAM);
        const getOACResponse = await cloudFrontClient.send(
          new GetOriginAccessControlCommand({ Id: d.Id }),
        );
        etag = getOACResponse.ETag;
      } catch (e) {
        console.error(`Unable to get etag for origin access control ${d.Id}`);
        throw e;
      }
      let deleteOAC;
      try {
        const cloudFrontClient = createCloudFrontClient(useIAM);
        deleteOAC = await cloudFrontClient.send(
          new DeleteOriginAccessControlCommand({ Id: d.Id, IfMatch: etag }),
        );
      } catch (e) {
        console.error(`Unable to delete origin access control ${d.Id}`);
        console.error(`Failed to delete origin access control ${d.Id}`);
        console.error(e);
        throw e;
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

/**
 *
 * @param useIAM
 * @param deletedLoadBalancer
 */
const deleteTargetGroup = async (useIAM, deletedLoadBalancer) => {
  //FUBAR Need to killize this
  await deletedLoadBalancer;
  let getTargetGroups;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    const describeTargetGroupsResponse = await elbv2Client.send(
      new DescribeTargetGroupsCommand({}),
    );
    getTargetGroups = {
      stdout: JSON.stringify({ TargetGroups: describeTargetGroupsResponse.TargetGroups }),
    };
  } catch (e) {
    console.error(`Unable to list target groups`);
    throw e;
  }
  let targetGroups = JSON.parse(getTargetGroups.stdout).TargetGroups.map((tg) => {
    return tg.TargetGroupArn;
  });
  if (targetGroups.length > 0) {
    return Promise.all(
      targetGroups.map(async (tg) => {
        try {
          const elbv2Client = createELBv2Client(useIAM);
          await elbv2Client.send(new DescribeTargetGroupsCommand({ TargetGroupArns: [tg] }));
        } catch (e) {
          console.warn(
            "\x1b[31m%s\x1b[0m",
            `Unable to find target group ${tg}. May have already been deleted. Skipping.`,
          );
          return true;
        }
        try {
          const elbv2Client = createELBv2Client(useIAM);
          await elbv2Client.send(new DeleteTargetGroupCommand({ TargetGroupArn: tg }));
        } catch (e) {
          console.error(`Unable to delete associated target group`);
          console.error(e);
        }
      }),
    );
  } else {
    console.log(`No target group. Skipping.`);
    return true;
  }
};

/**
 *
 * @param useIAM
 * @param killTag
 * @param awsResources
 * @param deletedCloudFront
 */
const deleteBucket = async (useIAM, killTag, awsResources, deletedCloudFront) => {
  await deletedCloudFront;
  //FUBAR Need to killize this
  let buckets;
  try {
    const s3Client = createS3Client(useIAM);
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    buckets = { stdout: JSON.stringify({ Buckets: listBucketsResponse.Buckets }) };
  } catch (e) {
    console.error(`Unable to list buckets`);
    throw e;
  }
  if (JSON.parse(buckets.stdout).Buckets.length > 0) {
    return Promise.all(
      JSON.parse(buckets.stdout).Buckets.map(async (b) => {
        console.log(`Deleting s3 bucket ${b.Name}}`);
        try {
          const s3Client = createS3Client(useIAM);
          // List all objects in the bucket
          let isTruncated = true;
          let continuationToken;
          while (isTruncated) {
            const listParams = {
              Bucket: b.Name,
              ...(continuationToken && { ContinuationToken: continuationToken }),
            };
            const listResponse = await s3Client.send(new ListObjectsV2Command(listParams));

            // Delete objects if any exist
            if (listResponse.Contents && listResponse.Contents.length > 0) {
              const deleteParams = {
                Bucket: b.Name,
                Delete: {
                  Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
                },
              };
              await s3Client.send(new DeleteObjectsCommand(deleteParams));
            }

            isTruncated = listResponse.IsTruncated;
            continuationToken = listResponse.NextContinuationToken;
          }

          // Delete the bucket
          await s3Client.send(new DeleteBucketCommand({ Bucket: b.Name }));
        } catch (e) {
          console.warn(`Unable to delete s3 bucket ${awsResources.awsName}`);
        }
      }),
    );
  } else {
    console.log(`No s3 bucket. Skipping.`);
    return true;
  }
};

/**
 *
 * @param useIAM
 * @param killTag
 * @param deletedDBs
 */
const deleteSecurityGroups = async (useIAM, killTag, deletedDBs) => {
  console.log(`Before deleting security groups, wait for DBs to be completed deleted`);
  await deletedDBs;
  console.log(`DBs deleted. Can start deleting security groups.`);
  /**
   *
   * @param g
   * @param useIAM
   * @param killTag
   */
  const deleteMyGroup = async (g, useIAM, killTag) => {
    console.log(`Deleting security group ${g}`);
    try {
      const ec2Client = createEC2Client(useIAM);
      await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupNames: [g] }));
    } catch (e) {
      console.log(e);
      console.log(`No security group ${g}.`);
      return true;
    }
    try {
      const ec2Client = createEC2Client(useIAM);
      await ec2Client.send(new DeleteSecurityGroupCommand({ GroupName: g }));
    } catch (e) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to delete security group ${g}. PROBABLY this is because AWS needs something else to delete first.\n We recommend you retry 'pushkin aws armageddon' in a few minutes.`,
      );
      console.warn("\x1b[31m%s\x1b[0m", e);
      return true;
    }
    return true;
  };

  let groupsToDelete = [];
  let tempGroupList;
  try {
    const ec2Client = createEC2Client(useIAM);
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    tempGroupList = {
      stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
    };
  } catch (e) {
    console.error(`Unable to list security groups`);
    throw e;
  }
  JSON.parse(tempGroupList.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName != "default") {
      //can't delete the default!
      if (!killTag) {
        //kill them all
        groupsToDelete.push(g.GroupName);
      } else {
        if (g.Tags[0].Value == killTag) {
          groupsToDelete.push(g.GroupName);
        }
      }
    }
  });
  return Promise.all(groupsToDelete.map((g) => deleteMyGroup(g, useIAM, killTag)));
};

/**
 *
 * @param useIAM
 * @param killType
 */
export const awsArmageddon = async (useIAM, killType) => {
  let temp, awsResources;
  try {
    awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
  } catch (e) {
    console.error(`Unable to load awsResources.js`);
  }
  let projName;
  if (awsResources) {
    projName = awsResources.name; //can use this to identify resources needing deletion
  } else {
    if (killType == "kill") {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to find awsResources.js. You won't be able to run kill.\n Either delete AWS deploy manually or run aws armageddon to delete everything including things not related to your project..`,
      );
    }
  }
  const killTag = killType == "kill" ? projName : false;

  const deletedStack = deleteStack(useIAM, killTag);

  let deletedCluster;
  try {
    deletedCluster = deleteCluster(deletedStack, useIAM, killTag, projName, awsResources);
  } catch (e) {
    console.warn("\x1b[31m%s\x1b[0m", e);
    //Don't exit. Might as well try deleting other things, too.
  }

  let deletedDBs, dbsToDelete;
  try {
    dbsToDelete = dbsToDeleteFunc(useIAM, killTag, awsResources);
  } catch (e) {
    console.warn("\x1b[31m%s\x1b[0m", e);
  }
  try {
    deletedDBs = deleteDatabases(dbsToDelete, useIAM, killTag);
  } catch (e) {
    console.warn("\x1b[31m%s\x1b[0m", e);
  }

  let deletedLoadBalancer;
  try {
    deletedLoadBalancer = deleteLoadBalancer(useIAM, killTag);
  } catch (e) {
    //Nothing
  }

  let deletedCloudFront;
  try {
    deletedCloudFront = deleteCloudFront(useIAM, projName, killTag);
  } catch (e) {
    //Nothing
  }

  let deletedResourceRecords;
  try {
    deletedResourceRecords = deleteResourceRecords(useIAM, killTag, projName);
  } catch (e) {
    console.warn("\x1b[31m%s\x1b[0m", `Unable to delete resource records`);
    console.warn("\x1b[31m%s\x1b[0m", e); //don't fail on this
  }

  let deletedOACs;
  try {
    deletedOACs = deleteOACs(useIAM, deletedCloudFront, killTag);
  } catch (e) {
    console.warn("\x1b[31m%s\x1b[0m", `Unable to delete origin access controls`);
    throw e;
  }

  let deletedTargetGroup;
  try {
    deletedTargetGroup = deleteTargetGroup(useIAM, deletedLoadBalancer);
  } catch (e) {
    //nothing
  }

  let deletedBucket;
  try {
    deletedBucket = deleteBucket(useIAM, killTag, awsResources, deletedCloudFront);
  } catch (e) {
    //nothing
  }

  let deletedGroups;
  try {
    deletedGroups = deleteSecurityGroups(useIAM, killTag, deletedDBs);
  } catch (e) {
    // Do nothing
  }

  //FUBAR Should we delete ACL as well?

  console.log(`Updating awsResources.js`);
  let awsResourcesNull = {
    name: projName,
    awsName: null,
    iam: useIAM,
    dbs: [],
    cloudFrontId: null,
    ECSName: null,
    OAC: null,
  };
  // Remove undefined properties
  Object.keys(awsResourcesNull).forEach((key) => {
    if (awsResourcesNull[key] === undefined) {
      delete awsResourcesNull[key];
    }
  });
  try {
    await fs.promises.writeFile(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResourcesNull),
      "utf8",
    );
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  // Wait for everything to be deleted
  await Promise.all([
    deletedGroups,
    deletedResourceRecords,
    deletedBucket,
    deletedCloudFront,
    deletedDBs,
    deletedLoadBalancer,
    deletedOACs,
    deletedCluster,
    deletedTargetGroup,
  ]);

  console.log(
    `The following resources were either not deleted or are still in the process of being deleted:`,
  );
  await awsList(useIAM);
  console.log(`
    If this list is non-empty but you expect it to be empty, wait 10 minutes and run 'pushkin aws list'.
    If the list is still non-empty, try re-running 'pushkin aws armageddon'.
    If 10 minutes after that, 'pushkin aws list' still returns a non-empty list and you don't know why, contact AWS support to ensure that you are not being charged for services you aren't using.`);

  return;
};

/**
 *
 * @param useIAM
 */
export async function awsList(useIAM) {
  let temp;

  const rdsClient = createRDSClient(useIAM);
  const describeDBInstancesResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));
  temp = { stdout: JSON.stringify({ DBInstances: describeDBInstancesResponse.DBInstances }) };
  if (JSON.parse(temp.stdout).DBInstances.length > 0) {
    console.log("DBInstances:\n", JSON.parse(temp.stdout).DBInstances);
  }
  const ecsClient = createECSClient(useIAM);
  const describeClustersResponse = await ecsClient.send(new DescribeClustersCommand({}));
  if (describeClustersResponse.clusters.length > 0) {
    console.log("ECS Clusters:\n", describeClustersResponse.clusters);
  }
  const ec2Client = createEC2Client(useIAM);
  const describeSecurityGroupsResponse = await ec2Client.send(
    new DescribeSecurityGroupsCommand({}),
  );
  temp = {
    stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
  };
  JSON.parse(temp.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName != "default") {
      console.log("Security Group:\n", g);
    }
  });
  const elbv2Client = createELBv2Client(useIAM);
  const describeLoadBalancersResponse = await elbv2Client.send(
    new DescribeLoadBalancersCommand({}),
  );
  temp = { stdout: JSON.stringify({ LoadBalancers: describeLoadBalancersResponse.LoadBalancers }) };
  if (JSON.parse(temp.stdout).LoadBalancers.length > 0) {
    console.log("Load Balancers:\n", JSON.parse(temp.stdout).LoadBalancers);
  }
  const s3Client = createS3Client(useIAM);
  const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
  temp = { stdout: JSON.stringify({ Buckets: listBucketsResponse.Buckets }) };
  if (JSON.parse(temp.stdout).Buckets.length > 0) {
    console.log("S3 Buckets:\n", JSON.parse(temp.stdout).Buckets);
  }
  const cloudFrontClient = createCloudFrontClient(useIAM);
  const listDistributionsResponse = await cloudFrontClient.send(new ListDistributionsCommand({}));
  temp = {
    stdout: JSON.stringify({ DistributionList: listDistributionsResponse.DistributionList }),
  };
  if (temp.stdout != "") {
    console.log("CloudFront Distributions:\n", JSON.parse(temp.stdout));
  }
  const cloudFormationClient = createCloudFormationClient(useIAM);
  const describeStacksResponse = await cloudFormationClient.send(new DescribeStacksCommand({}));
  temp = { stdout: JSON.stringify({ Stacks: describeStacksResponse.Stacks }) };
  if (JSON.parse(temp.stdout).Stacks.length > 0) {
    console.log("Cloudformation Stacks:\n", JSON.parse(temp.stdout).Stacks);
  }
  const describeDBSnapshotsResponse = await rdsClient.send(new DescribeDBSnapshotsCommand({}));
  temp = { stdout: JSON.stringify({ DBSnapshots: describeDBSnapshotsResponse.DBSnapshots }) };
  if (JSON.parse(temp.stdout).DBSnapshots.length > 0) {
    console.log("DB Snapshots:\n", JSON.parse(temp.stdout).DBSnapshots);
  }
  temp = await exec(`aws secretsmanager list-secrets --profile ${useIAM}`);
  if (JSON.parse(temp.stdout).SecretList.length > 0) {
    console.log("Secrets:\n", JSON.parse(temp.stdout).SecretList);
  }
}

/**
 *
 * @param useIAM
 * @param projName
 */
export const createAutoScale = async (useIAM, projName) => {
  const shortName = projName.replace(/[^A-Za-z0-9]/g, "");
  const snsName = shortName.concat("Alarms");
  let TopicArn, targGroupARN, ECSName, balancerARN, loadBalancerName, useEmail;

  console.log("Reading config information to configure autoscaling and alarms");
  try {
    let awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
    ECSName = awsResources.ECSName;
    targGroupARN = awsResources.targGroupARN;
    loadBalancerName = awsResources.loadBalancerName;
  } catch (e) {
    console.error(`Unable to read ECSName from awsResources.js`);
    throw e;
  }

  let alarmMainHigh = JSON.parse(JSON.stringify(alarmRDSHigh));
  let alarmTransactionHigh = JSON.parse(JSON.stringify(alarmRDSHigh));
  try {
    let temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    let config = jsYaml.load(temp);
    alarmMainHigh.Dimensions.Value = config.productionDBs.Main.name;
    alarmTransactionHigh.Dimensions.Value = config.productionDBs.Transaction.name;
    useEmail = config.info.email;
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }

  let describedLoadBalancers;
  try {
    const elbv2Client = createELBv2Client(useIAM);
    let describedLoadBalancers = await elbv2Client.send(
      new DescribeLoadBalancersCommand({ Names: [loadBalancerName] }),
    );
    balancerARN = describedLoadBalancers.LoadBalancers[0].LoadBalancerArn;
  } catch (e) {
    console.error(`Unable to find load balancer ARN`);
  }

  console.log("Creating SNS topic");

  try {
    // This action is idempotent, so if the requester already owns a topic with the specified name, that topic’s ARN is returned without creating a new topic.
    let temp = await exec(`aws sns create-topic --name ${snsName} --profile ${useIAM}`);
    TopicArn = JSON.parse(temp.stdout).TopicArn;
  } catch (e) {
    console.error(`Unable to create SNS topic`);
    throw e;
  }
  try {
    //Looks like this can be repeated
    let temp = await exec(
      `aws sns subscribe --topic-arn ${TopicArn} --protocol email --notification-endpoint ${useEmail} --profile ${useIAM}`,
    );
  } catch (e) {
    console.error(`Unable to subscribe to SNS topic`);
    throw e;
  }

  console.log("Registering cloudwatch alarms");
  alarmCPUHigh.AlarmActions = TopicArn;
  alarmCPUHigh.Dimensions.Value = ECSName;
  alarmCPUHigh.AlarmName = shortName.concat("alarmCPUHigh");
  let setAlarmCPUHigh;
  try {
    setAlarmCPUHigh = exec(
      `aws cloudwatch put-metric-alarm --alarm-name ${alarmCPUHigh.AlarmName} --cli-input-json ${JSON.stringify(alarmCPUHigh)} --profile ${useIAM}`,
    );
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmCPUHigh.AlarmName}`);
    throw e;
  }

  alarmRAMHigh.AlarmActions = TopicArn;
  alarmRAMHigh.Dimensions.Value = ECSName;
  alarmRAMHigh.AlarmName = shortName.concat("alarmRAMHigh");
  let setAlarmRAMHigh;
  try {
    setAlarmRAMHigh = exec(
      `aws cloudwatch put-metric-alarm --alarm-name ${alarmRAMHigh.AlarmName} --cli-input-json ${JSON.stringify(alarmRAMHigh)} --profile ${useIAM}`,
    );
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmRAMHigh.AlarmName}`);
    throw e;
  }

  alarmMainHigh.AlarmActions = TopicArn;
  alarmMainHigh.AlarmName = shortName.concat("Main").concat("alarmRAMHigh");
  alarmTransactionHigh.AlarmActions = TopicArn;
  alarmTransactionHigh.AlarmName = shortName.concat("Transaction").concat("alarmRAMHigh");

  try {
    dbAlarmMain = exec(
      `aws cloudwatch put-metric-alarm --alarm-name ${alarmMainHigh.AlarmActions} --cli-input-json ${JSON.stringify(alarmMainHigh)} --profile ${useIAM}`,
    );
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmMainHigh.AlarmName}`);
    throw e;
  }
  try {
    dbAlarmTransaction = exec(
      `aws cloudwatch put-metric-alarm --alarm-name ${alarmTransactionHigh.AlarmActions} --cli-input-json ${JSON.stringify(alarmTransactionHigh)} --profile ${useIAM}`,
    );
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmTransactionHigh.AlarmName}`);
    throw e;
  }

  console.log(`Finding autoscaling launch configuration`);
  let asGroup;
  try {
    let temp = await exec(`aws autoscaling describe-auto-scaling-groups --profile ${useIAM}`);
    JSON.parse(temp.stdout).AutoScalingGroups.forEach((l) => {
      if (l.AutoScalingGroupName.search(shortName)) {
        asGroup = l.AutoScalingGroupName;
      }
    });
  } catch (e) {
    console.log(`Unable to find launch configuration name`);
    throw e;
  }

  try {
    await exec(
      `aws autoscaling update-auto-scaling-group --auto-scaling-group-name ${asGroup} --min-size 2 --max-size 10 --desired-capacity 2 --profile ${useIAM}`,
    );
    await exec(
      `aws autoscaling attach-load-balancer-target-groups --auto-scaling-group-name ${asGroup} --target-group-arns ${targGroupARN} --profile ${useIAM}`,
    );
  } catch (e) {
    console.error(`Unable to update settings for autoscaling group`);
    throw e;
  }

  const label1 = balancerARN.split("loadbalancer/")[1];
  const label2 = "/targetgroup".concat(targGroupARN.split("targetgroup")[1]);
  scalingPolicyTargets.PredefinedMetricSpecification.ResourceLabel = label1.concat(label2);

  let alarmUp;
  let alarmDown;
  let policyARN;
  try {
    let temp = await exec(
      `aws autoscaling put-scaling-policy --policy-name MyPushkinPolicy --auto-scaling-group-name ${asGroup} --policy-type TargetTrackingScaling --target-tracking-configuration ${scalingPolicyTargets} --profile ${useIAM}`,
    );
    alarmUp = JSON.parse(temp.stdout).Alarms[0];
    alarmDown = JSON.parse(temp.stdout).Alarms[1];
    policyARN = JSON.parse(temp.stdout).PolicyARN;
  } catch (e) {
    console.error(`Unable to make autoscaling policy`);
    throw e;
  }

  console.log(`Updating awsResources with autoscaling info`);
  try {
    let awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
    awsResources.alarmUp = alarmUp;
    awsResources.alarmDown = alarmDown;
    awsResources.policyARN = policyARN;
    fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    throw e;
  }

  // try {
  //   let temp1 = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarm1.AlarmName} --alarm-actions ${TopicArn} --evaluation-periods 3 --comparison-operator LessThanThreshold --profile ${useIAM}`)
  //   let temp2 = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarm1.AlarmName} --alarm-actions ${TopicArn} --comparison-operator GreaterThanThreshold --profile ${useIAM}`)
  //   await Promise.all([ temp1, temp2 ])
  // } catch (e) {
  //   console.log(`unable to subscribe to alarms`)
  //   throw e
  // }

  return Promise.all([dbAlarmTransaction, dbAlarmMain, setAlarmRAMHigh, setAlarmCPUHigh]);
};
