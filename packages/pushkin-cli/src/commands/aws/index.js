/**
 * AWS Command Orchestration
 * Coordinates AWS deployment phases for Pushkin projects
 *
 * Architecture:
 * - Delegates to phase modules for testability and maintainability
 * - Each phase handles a specific deployment concern
 * - Phases are orchestrated in dependency order
 * - Supports both new deployments and updates
 * @module aws
 */

import { v4 as uuid } from "uuid";
import {
  alarmRAMHigh,
  alarmCPUHigh,
  alarmRDSWriteLatencyHigh,
  scalingPolicyTargets,
} from "./awsConfigs.js";
import { updatePushkinJs } from "../prep/index.js";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
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
import { loadPushkinConfig, savePushkinConfig } from "../../utils/pushkin-config.js";
import { AWS_REGION, exec } from "./constants.js";
import { getProjectStatus } from "./services/status.js";

// Import phase modules
import { initializeDeployment, updateDeploymentConfig } from "./phases/setup.js";
import { gatherUserInput } from "./phases/user-input.js";
import { provisionInfrastructure } from "./phases/infrastructure.js";
import { setupCompute } from "./phases/compute.js";
import { setupDatabases } from "./phases/database-setup.js";
import { deployApplication } from "./phases/deployment.js";
import { cleanupResources } from "./phases/cleanup.js";

// Re-export functions that are used by the main CLI
import { verifyIAMCredentials } from "./services/security.js";
import { syncS3 } from "./services/s3.js";
export { verifyIAMCredentials, syncS3 };

/**
 * Main AWS deployment command
 * Orchestrates the complete deployment process through discrete phases
 * @param {string} projName - The project name
 * @param {string} s3BucketName - The S3 bucket name (AWS resource name)
 * @param {string|object} useIAM - The IAM profile name or object with iam property
 * @param {string} DHID - The DockerHub ID
 * @returns {Promise<void>}
 */
export async function awsInit(projName, s3BucketName, useIAM, DHID) {
  // Phase 1: Setup - Load config, verify credentials
  const { profileName, config } = await initializeDeployment(useIAM);

  // Phase 2: User Input - Get domain and certificate choices
  const { domain, certificate } = await gatherUserInput(profileName);

  // Update config with deployment info
  await updateDeploymentConfig(config, projName, s3BucketName, domain);
  updatePushkinJs();

  // Phase 3: Infrastructure - Create databases, S3, security groups
  const { completedDBs, builtFrontEnd } = await provisionInfrastructure(
    config,
    profileName,
    projName,
  );

  // Phase 4: Compute - Set up ECS cluster, tasks, load balancer
  const configuredECS = setupCompute(projName, profileName, DHID, completedDBs, certificate);

  // Phase 5: Database Setup - Run migrations and transaction setup
  const dbSetup = setupDatabases(Promise.resolve(completedDBs));

  // Phase 6: Deployment - Publish Docker images, deploy frontend, configure API forwarding
  const { deployedFrontEnd, apiForwarded, cloudDomain } = await deployApplication({
    config,
    DHID,
    projName,
    s3BucketName,
    profileName,
    domain,
    certificate,
    builtFrontEnd,
    configuredECS,
  });

  // Update config with final domain info for default deployments
  if (domain === "default" && cloudDomain) {
    config.info.rootDomain = cloudDomain;
  }

  await Promise.all([deployedFrontEnd, dbSetup, apiForwarded]);

  // Save final config with database info
  await savePushkinConfig(completedDBs);

  console.log("✅ AWS deployment complete!");
}

/**
 * Name the project and create AWS resources file
 * @param {string} projName - The project name
 * @returns {Promise<string>} - The S3 bucket name
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
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  if (pushkinConfig.productionDBs) {
    Object.keys(pushkinConfig.productionDBs).forEach((db) => {
      pushkinConfig.productionDBs[db].name = null;
      pushkinConfig.productionDBs[db].host = null;
      pushkinConfig.productionDBs[db].pass = null;
      // Leave port and user in place, since those are unlikely to change
    });
    try {
      await savePushkinConfig(pushkinConfig);
    } catch (error) {
      console.error(`Failed to save pushkin.yaml:`, error);
      throw error;
    }
  }

  return awsResources.s3BucketName;
}

/**
 * Add IAM profile to AWS resources
 * @param {string} iam - The IAM profile name
 * @returns {Promise<void>}
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

/**
 * Delete all AWS resources (armageddon command)
 * @param {string|object} useIAM - The IAM profile name or object with iam property
 * @param {string} killType - The type of kill operation ('kill' or 'armageddon')
 * @returns {Promise<void>}
 */
export const awsArmageddon = async (useIAM, killType) => {
  // Normalize useIAM to always be a string
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;

  await cleanupResources(profileName, killType);

  console.log(
    `The following resources were either not deleted or are still in the process of being deleted:`,
  );
  await awsList(profileName);
  console.log(`
    If this list is non-empty but you expect it to be empty, wait 10 minutes and run 'pushkin aws list'.
    If the list is still non-empty, try re-running 'pushkin aws armageddon'.
    If 10 minutes after that, 'pushkin aws list' still returns a non-empty list and you don't know why, contact AWS support to ensure that you are not being charged for services you aren't using.`);
};

/**
 * List all AWS resources in the account
 * @param {string|object} useIAM - The IAM profile name or object with iam property
 * @returns {Promise<void>}
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
 * Get detailed status of AWS resources for the current project
 * Unlike awsList which shows ALL resources in the account,
 * this shows only resources belonging to the current Pushkin project
 *
 * @param {string|object} useIAM - The IAM profile name or object with iam property
 * @param {boolean} verbose - Whether to show verbose output
 * @returns {Promise<void>}
 */
export async function awsStatus(useIAM, verbose = false) {
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
  return getProjectStatus(profileName, verbose);
}

/**
 * Create auto-scaling configuration and CloudWatch alarms
 * Monitors CPU, RAM, and database performance with SNS notifications
 *
 * @param {string|object} useIAM - The IAM profile name or object with iam property
 * @param {string} projName - The project name
 * @returns {Promise<Array>} Array of alarm creation results
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

  const alarmMainHigh = structuredClone(alarmRDSWriteLatencyHigh);
  const alarmTransactionHigh = structuredClone(alarmRDSWriteLatencyHigh);
  try {
    const config = await loadPushkinConfig();
    alarmMainHigh.Dimensions[0].Value = config.productionDBs.Main.name;
    alarmTransactionHigh.Dimensions[0].Value = config.productionDBs.Transaction.name;
    useEmail = config.info.email;
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
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

  return Promise.all([dbAlarmTransaction, dbAlarmMain, setAlarmRAMHigh, setAlarmCPUHigh]);
};
