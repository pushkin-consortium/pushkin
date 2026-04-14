/**
 * A complete Infrastructure-as-Code solution for deploying a containerized web application to AWS with all production concerns handled!
 * The code follows an async orchestration pattern where:
  - Multiple AWS resources are created in parallel when possible
  - Dependencies are managed through await and Promise.all()
  - Each major component (DB, ECS, Frontend) can be set up independently
  - Extensive error handling and rollback capabilities

  Notable Features:
  - Idempotent operations - Can be run multiple times safely
  - Resource tagging - All resources tagged for easy cleanup
  - Security-first - Proper VPC, security groups, SSL certificates
  - Production-ready - Auto-scaling, monitoring, CDN, database backups
 */

import { v4 as uuid } from "uuid";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import {
  alarmRAMHigh,
  alarmCPUHigh,
  alarmRDSWriteLatencyHigh,
  scalingPolicyTargets,
} from "./awsConfigs.js";
import { runMigrations, getMigrations } from "../setupdb/index.js";
import { updatePushkinJs } from "../prep/index.js";
import inquirer from "inquirer";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { Route53DomainsClient, ListDomainsCommand } from "@aws-sdk/client-route-53-domains";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBSnapshotsCommand,
} from "@aws-sdk/client-rds";
import { CloudFrontClient, ListDistributionsCommand } from "@aws-sdk/client-cloudfront";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { ECSClient, DescribeClustersCommand } from "@aws-sdk/client-ecs";
import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { AWSClientFactory } from "./utils/aws-client-factory.js";
import { readAwsResources, writeAwsResources } from "./utils/aws-resources.js";
import { AWS_REGION, exec } from "./constants.js";

// Import from service modules
import { initDB, recordDBs, dbsToDeleteFunc, deleteDatabases } from "./services/rds.js";
import { setupECS, deleteStack, deleteCluster } from "./services/ecs.js";
import { deployFrontEnd, deleteCloudFront, deleteOACs } from "./services/cloudfront.js";
import { buildFrontEnd, deleteBucket } from "./services/s3.js";
import { deleteResourceRecords } from "./services/route53.js";
import { forwardAPIWrapper, deleteLoadBalancer, deleteTargetGroup } from "./services/elb.js";
import { ensureDatabaseSecurityGroup, deleteSecurityGroups } from "./services/security.js";
import { createLogGroup, chooseCertificate } from "./services/monitoring.js";
import { publishToDocker, rebuildWorker } from "./services/docker.js";

/**
 * Handle database migrations
 * @param {Promise<object>} completedDBs - A promise that resolves to the completed databases
 * @returns {Promise<Map>} - A promise that resolves to a map of databases to their migration status
 */
const migrationsWrapper = async (completedDBs) => {
  console.log(`Handling main table migrations`);
  let dbsToExps, ranMigrations;
  let info = await completedDBs;
  dbsToExps = await getMigrations(
    path.join(process.cwd(), info.usersDir || "users"),
    path.join(process.cwd(), info.experimentsDir),
    true,
  );
  ranMigrations = runMigrations(dbsToExps, info.productionDBs);
  return ranMigrations;
};

/**
 * Handle transaction table setup
 * @param {Promise<object>} completedDBs - A promise that resolves to the completed databases
 * @returns {Promise} - A promise that resolves when the transaction table is set up
 */
const setupTransactionsWrapper = async (completedDBs) => {
  let info = await completedDBs;
  let transMigrations = new Map();
  transMigrations.set("Transaction", [
    { migrations: path.join(process.cwd(), "coreMigrations"), seeds: "" },
  ]);
  let setupTransactionsTable;
  setupTransactionsTable = runMigrations(transMigrations, info.productionDBs);
  return setupTransactionsTable;
};

/**
 * Main orchestrator that initializes AWS deployment:
 * 1. Gets SSL certificates and domain choices from user
 * 2. Coordinates all the deployment steps
 * 3. Runs database migrations
 * 4. Sets up monitoring and scaling
 * @param {string} projName - The project name
 * @param {string} s3BucketName - The AWS resource name
 * @param {string} useIAM - The IAM profile name
 * @param {string} DHID - The DockerHub ID
 * @returns {Promise<void>} - A promise that resolves when initialization is complete
 */
export async function awsInit(projName, s3BucketName, useIAM, DHID) {
  // Normalize useIAM to always be a string
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;

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
    myCertificate = await chooseCertificate(profileName); //Waiting because otherwise input query gets buried
  } catch (e) {
    console.error(`Unable to choose certificate.`);
    throw e;
  }

  console.log(`Looks good!`);
  // process.exit();

  /**
   * Choose a domain for the site
   * @param {string} profileName - The IAM profile name
   * @returns {Promise<string>} - A promise that resolves to the chosen domain
   */
  const chooseDomain = async (profileName) => {
    console.log("Choosing domain name for site");
    let temp;
    try {
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const route53DomainsClient = factory.createClient(Route53DomainsClient);
      const listDomainsResponse = await route53DomainsClient.send(new ListDomainsCommand({}));
      temp = { stdout: JSON.stringify({ Domains: listDomainsResponse.Domains }) };
    } catch (e) {
      console.error(`Unable to get list of SSL certificates`);
    }
    let domains = ["default"];
    JSON.parse(temp.stdout).Domains.forEach((c) => {
      domains.push(c.DomainName);
    });
    domains.push("Enter a custom domain/subdomain");

    return new Promise((resolve) => {
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
        .then(async (answers) => {
          if (answers.domain === "Enter a custom domain/subdomain") {
            const customDomain = await inquirer.prompt([
              {
                type: "input",
                name: "customDomain",
                message: "Enter your custom domain or subdomain (e.g., subdomain.example.com):",
                validate: (input) => {
                  if (!input || input.trim().length === 0) {
                    return "Domain cannot be empty";
                  }
                  return true;
                },
              },
            ]);
            resolve(customDomain.customDomain);
          } else {
            resolve(answers.domain);
          }
        });
    });
  };
  let myDomain;
  myDomain = await chooseDomain(profileName); //Waiting because otherwise input query gets buried

  pushkinConfig.info.rootDomain = myDomain;
  pushkinConfig.info.projName = projName;
  pushkinConfig.info.s3BucketName = s3BucketName;
  await fs.promises.writeFile(
    path.join(process.cwd(), "pushkin.yaml"),
    jsYaml.dump(pushkinConfig),
    "utf8",
  );
  console.log(`Successfully updated pushkin.yaml with custom domain.`);
  updatePushkinJs();

  //Databases take BY FAR the longest, so start them right after certificate (certificate comes first or things get confused)
  let securityGroupID = await ensureDatabaseSecurityGroup(profileName, projName);

  console.log(`Creating Main database promise...`);
  const initializedMainDB = initDB("Main", securityGroupID, projName, profileName);
  console.log(`Main database initialization started`);

  console.log(`Creating Transaction database promise...`);
  const initializedTransactionDB = initDB("Transaction", securityGroupID, projName, profileName);
  console.log(`Transaction database initialization started`);

  let completedDBs;
  try {
    console.log("Starting database recording process...");
    console.log("Awaiting database initialization completion...");
    completedDBs = await recordDBs(Promise.all([initializedMainDB, initializedTransactionDB]));
    console.log("Database recording completed successfully");
  } catch (e) {
    console.error("Failed to record databases:", e);
    throw e;
  }

  const expDirs = fs.readdirSync(path.join(process.cwd(), pushkinConfig.experimentsDir));
  let rebuiltWorkers;
  try {
    rebuiltWorkers = Promise.all(expDirs.map(rebuildWorker));
  } catch (err) {
    console.error(err);
    throw err;
  }

  createLogGroup(profileName, projName);

  //pushing stuff to DockerHub
  let publishedToDocker = publishToDocker(DHID, rebuiltWorkers);

  //build front-end
  const builtFrontEnd = buildFrontEnd(projName);

  const deployedFrontEnd = deployFrontEnd(
    projName,
    s3BucketName,
    profileName,
    myDomain,
    myCertificate,
    builtFrontEnd,
  );

  publishedToDocker = await publishedToDocker; //need this to configure ECS
  const configuredECS = setupECS(
    projName,
    s3BucketName,
    profileName,
    DHID,
    Promise.resolve(completedDBs),
    myCertificate,
  );

  const setupTransactionsTable = setupTransactionsWrapper(Promise.resolve(completedDBs));

  const ranMigrations = migrationsWrapper(Promise.resolve(completedDBs));

  const apiForwarded = forwardAPIWrapper(
    configuredECS,
    profileName,
    projName,
    myDomain,
    deployedFrontEnd,
  );

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

  pushkinConfig = completedDBs;

  console.log("DEBUG: Waiting for final operations to complete...");

  // Add individual promise logging to identify hanging operations
  console.log("DEBUG: Waiting for deployedFrontEnd...");
  await deployedFrontEnd;
  console.log("DEBUG: deployedFrontEnd resolved");

  console.log("DEBUG: Waiting for setupTransactionsTable...");
  await setupTransactionsTable;
  console.log("DEBUG: setupTransactionsTable resolved");

  console.log("DEBUG: Waiting for ranMigrations...");
  await ranMigrations;
  console.log("DEBUG: ranMigrations resolved");

  console.log("DEBUG: Waiting for apiForwarded...");
  await apiForwarded;
  console.log("DEBUG: apiForwarded resolved");

  console.log("DEBUG: All final operations completed");

  await fs.promises.writeFile(
    path.join(process.cwd(), "pushkin.yaml"),
    jsYaml.dump(pushkinConfig),
    "utf8",
  );

  return;
}

/**
 * Name the project and create AWS resources file
 * @param {string} projName - The project name
 * @returns {Promise<string>} - A promise that resolves to the AWS name
 */
export async function nameProject(projName) {
  console.log(`Recording project name`);
  let awsResources = {};
  let temp, pushkinConfig;
  awsResources.name = projName;

  // Generate S3-compliant bucket name from project name
  // AWS S3 bucket naming rules:
  // - Must be globally unique across ALL AWS accounts
  // - Must be 3-63 characters long
  // - Can only contain lowercase letters, numbers, hyphens
  // - Must start with a letter or number (not hyphen)
  // We append a UUID to ensure global uniqueness
  temp = projName
    .replace(/[^\w\s]/g, "") // Remove special chars except word chars and spaces
    .replace(/ /g, "-") // Replace spaces with hyphens
    .replace(/_/g, "-") // Replace underscores with hyphens
    .concat(uuid()) // Add UUID for global uniqueness
    .toLowerCase(); // Convert to lowercase
  if (temp.search(/[a-zA-Z]/g) != 0) {
    temp = "p".concat(temp); // Prepend 'p' if doesn't start with letter
  }
  awsResources.s3BucketName = temp;
  try {
    writeAwsResources(awsResources);
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

  if (pushkinConfig.productionDBs) {
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

  return awsResources.s3BucketName;
}

/**
 * Add IAM profile to AWS resources
 * @param {string} iam - The IAM profile name
 * @returns {Promise<void>} - A promise that resolves when complete
 */
export async function addIAM(iam) {
  let awsResources;
  try {
    awsResources = readAwsResources();
  } catch (e) {
    console.error(
      `Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }
  awsResources.iam = iam;
  try {
    writeAwsResources(awsResources);
  } catch (e) {
    console.error(
      `Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }
  return;
}

// TODO: Change to be less aggressive
/**
 * Delete all AWS resources
 * @param {string} useIAM - The IAM profile name
 * @param {string} killType - The type of kill operation ('kill' or 'armageddon')
 * @returns {Promise<void>} - A promise that resolves when deletion is complete
 */
export const awsArmageddon = async (useIAM, killType) => {
  // Normalize useIAM to always be a string
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;

  let awsResources;
  try {
    awsResources = readAwsResources();
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

  const deletedStack = deleteStack(profileName, killTag);

  const deletedCluster = deleteCluster(deletedStack, profileName, killTag, projName, awsResources);

  const dbsToDelete = dbsToDeleteFunc(profileName, killTag, awsResources);
  const deletedDBs = deleteDatabases(dbsToDelete, profileName, killTag);

  const deletedLoadBalancer = deleteLoadBalancer(profileName, killTag);

  // Delete CloudFront first, then OACs (CloudFront must be deleted before OACs can be deleted)
  const deletedCloudFront = deleteCloudFront(profileName, projName, killTag);

  let deletedOACs;
  try {
    deletedOACs = deleteOACs(profileName, deletedCloudFront, killTag);
  } catch (e) {
    console.warn("\x1b[31m%s\x1b[0m", `Unable to delete origin access controls`);
    console.warn("\x1b[31m%s\x1b[0m", e); // Don't fail the whole process for this
  }

  const deletedResourceRecords = deleteResourceRecords(profileName, killTag, projName);

  const deletedTargetGroup = deleteTargetGroup(profileName, deletedLoadBalancer);

  const deletedBucket = deleteBucket(profileName, killTag, awsResources, deletedCloudFront);

  const deletedGroups = deleteSecurityGroups(profileName, killTag, deletedDBs);

  //FUBAR Should we delete ACL as well?

  console.log(`Updating awsResources.js`);
  let awsResourcesNull = {
    name: projName,
    s3BucketName: null,
    iam: profileName,
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
    writeAwsResources(awsResourcesNull);
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
  await awsList(profileName);
  console.log(`
    If this list is non-empty but you expect it to be empty, wait 10 minutes and run 'pushkin aws list'.
    If the list is still non-empty, try re-running 'pushkin aws armageddon'.
    If 10 minutes after that, 'pushkin aws list' still returns a non-empty list and you don't know why, contact AWS support to ensure that you are not being charged for services you aren't using.`);

  return;
};

/**
 * List all AWS resources
 * @param {string} useIAM - The IAM profile name
 * @returns {Promise<void>} - A promise that resolves when listing is complete
 */
export async function awsList(useIAM) {
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
  const factory = new AWSClientFactory(AWS_REGION, profileName);

  const rdsClient = factory.createClient(RDSClient);
  const describeDBInstancesResponse = await rdsClient.send(new DescribeDBInstancesCommand({}));
  if (describeDBInstancesResponse.DBInstances.length > 0) {
    console.log("DBInstances:\n", describeDBInstancesResponse.DBInstances);
  }
  const ecsClient = factory.createClient(ECSClient);
  const describeClustersResponse = await ecsClient.send(new DescribeClustersCommand({}));
  if (describeClustersResponse.clusters.length > 0) {
    console.log("ECS Clusters:\n", describeClustersResponse.clusters);
  }
  const ec2Client = factory.createClient(EC2Client);
  const describeSecurityGroupsResponse = await ec2Client.send(
    new DescribeSecurityGroupsCommand({}),
  );
  describeSecurityGroupsResponse.SecurityGroups.forEach((g) => {
    if (g.GroupName != "default") {
      console.log("Security Group:\n", g);
    }
  });
  const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
  const describeLoadBalancersResponse = await elbv2Client.send(
    new DescribeLoadBalancersCommand({}),
  );
  if (describeLoadBalancersResponse.LoadBalancers.length > 0) {
    console.log("Load Balancers:\n", describeLoadBalancersResponse.LoadBalancers);
  }
  const s3Client = factory.createClient(S3Client);
  const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
  if (listBucketsResponse.Buckets.length > 0) {
    console.log("S3 Buckets:\n", listBucketsResponse.Buckets);
  }
  const cloudFrontClient = factory.createClient(CloudFrontClient);
  const listDistributionsResponse = await cloudFrontClient.send(new ListDistributionsCommand({}));
  if (listDistributionsResponse.DistributionList) {
    console.log("CloudFront Distributions:\n", listDistributionsResponse.DistributionList);
  }
  const cloudFormationClient = factory.createClient(CloudFormationClient);
  const describeStacksResponse = await cloudFormationClient.send(new DescribeStacksCommand({}));
  if (describeStacksResponse.Stacks.length > 0) {
    console.log("Cloudformation Stacks:\n", describeStacksResponse.Stacks);
  }
  const describeDBSnapshotsResponse = await rdsClient.send(new DescribeDBSnapshotsCommand({}));
  if (describeDBSnapshotsResponse.DBSnapshots.length > 0) {
    console.log("DB Snapshots:\n", describeDBSnapshotsResponse.DBSnapshots);
  }
  const secretsResult = await exec(`aws secretsmanager list-secrets --profile ${profileName}`);
  if (JSON.parse(secretsResult.stdout).SecretList.length > 0) {
    console.log("Secrets:\n", JSON.parse(secretsResult.stdout).SecretList);
  }
}

/**
 * Create auto-scaling configuration and CloudWatch alarms:
 * - Monitors CPU, RAM, database performance
 * - Configures SNS notifications
 * @param {string} useIAM - The IAM profile name
 * @param {string} projName - The project name
 * @returns {Promise<Array>} - A promise that resolves to an array of alarm creation results
 */
export const createAutoScale = async (useIAM, projName) => {
  // Normalize useIAM to always be a string
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;

  const shortName = projName.replace(/[^A-Za-z0-9]/g, "");
  const snsName = shortName.concat("Alarms");
  let TopicArn, targGroupARN, ECSName, balancerARN, loadBalancerName, useEmail;

  console.log("Reading config information to configure autoscaling and alarms");
  try {
    let awsResources = readAwsResources();
    ECSName = awsResources.ECSName;
    targGroupARN = awsResources.targGroupARN;
    loadBalancerName = awsResources.loadBalancerName;
  } catch (e) {
    console.error(`Unable to read ECSName from awsResources.js`);
    throw e;
  }

  let alarmMainHigh = JSON.parse(JSON.stringify(alarmRDSWriteLatencyHigh));
  let alarmTransactionHigh = JSON.parse(JSON.stringify(alarmRDSWriteLatencyHigh));
  try {
    let temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    let config = jsYaml.load(temp);
    alarmMainHigh.Dimensions[0].Value = config.productionDBs.Main.name;
    alarmTransactionHigh.Dimensions[0].Value = config.productionDBs.Transaction.name;
    useEmail = config.info.email;
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }

  try {
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    const describedLoadBalancers = await elbv2Client.send(
      new DescribeLoadBalancersCommand({ Names: [loadBalancerName] }),
    );
    balancerARN = describedLoadBalancers.LoadBalancers[0].LoadBalancerArn;
  } catch (e) {
    console.error(`Unable to find load balancer ARN`);
  }

  console.log("Creating SNS topic");

  try {
    // This action is idempotent, so if the requester already owns a topic with the specified name, that topic's ARN is returned without creating a new topic.
    let temp = await exec(`aws sns create-topic --name ${snsName} --profile ${profileName}`);
    TopicArn = JSON.parse(temp.stdout).TopicArn;
  } catch (e) {
    console.error(`Unable to create SNS topic`);
    throw e;
  }
  try {
    //Looks like this can be repeated
    await exec(
      `aws sns subscribe --topic-arn ${TopicArn} --protocol email --notification-endpoint ${useEmail} --profile ${profileName}`,
    );
  } catch (e) {
    console.error(`Unable to subscribe to SNS topic`);
    throw e;
  }

  console.log("Registering cloudwatch alarms");
  alarmCPUHigh.AlarmActions = TopicArn;
  alarmCPUHigh.Dimensions[0].Value = ECSName;
  alarmCPUHigh.AlarmName = shortName.concat("alarmCPUHigh");
  let setAlarmCPUHigh;
  try {
    setAlarmCPUHigh = exec(
      `aws cloudwatch put-metric-alarm --alarm-name ${alarmCPUHigh.AlarmName} --cli-input-json ${JSON.stringify(alarmCPUHigh)} --profile ${profileName}`,
    );
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmCPUHigh.AlarmName}`);
    throw e;
  }

  alarmRAMHigh.AlarmActions = TopicArn;
  alarmRAMHigh.Dimensions[0].Value = ECSName;
  alarmRAMHigh.AlarmName = shortName.concat("alarmRAMHigh");
  const setAlarmRAMHigh = exec(
    `aws cloudwatch put-metric-alarm --alarm-name ${alarmRAMHigh.AlarmName} --cli-input-json ${JSON.stringify(alarmRAMHigh)} --profile ${profileName}`,
  );

  alarmMainHigh.AlarmActions = TopicArn;
  alarmMainHigh.AlarmName = shortName.concat("Main").concat("alarmRAMHigh");
  alarmTransactionHigh.AlarmActions = TopicArn;
  alarmTransactionHigh.AlarmName = shortName.concat("Transaction").concat("alarmRAMHigh");

  const dbAlarmMain = exec(
    `aws cloudwatch put-metric-alarm --alarm-name ${alarmMainHigh.AlarmActions} --cli-input-json ${JSON.stringify(alarmMainHigh)} --profile ${profileName}`,
  );
  const dbAlarmTransaction = exec(
    `aws cloudwatch put-metric-alarm --alarm-name ${alarmTransactionHigh.AlarmActions} --cli-input-json ${JSON.stringify(alarmTransactionHigh)} --profile ${profileName}`,
  );

  console.log(`Finding autoscaling launch configuration`);
  let asGroup;
  try {
    let temp = await exec(`aws autoscaling describe-auto-scaling-groups --profile ${profileName}`);
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
      `aws autoscaling update-auto-scaling-group --auto-scaling-group-name ${asGroup} --min-size 2 --max-size 10 --desired-capacity 2 --profile ${profileName}`,
    );
    await exec(
      `aws autoscaling attach-load-balancer-target-groups --auto-scaling-group-name ${asGroup} --target-group-arns ${targGroupARN} --profile ${profileName}`,
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
      `aws autoscaling put-scaling-policy --policy-name MyPushkinPolicy --auto-scaling-group-name ${asGroup} --policy-type TargetTrackingScaling --target-tracking-configuration ${scalingPolicyTargets} --profile ${profileName}`,
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
    let awsResources = readAwsResources();
    awsResources.alarmUp = alarmUp;
    awsResources.alarmDown = alarmDown;
    awsResources.policyARN = policyARN;
    writeAwsResources(awsResources);
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
