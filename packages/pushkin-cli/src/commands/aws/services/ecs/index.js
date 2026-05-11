/**
 * AWS ECS Service Management
 * Orchestrates ECS cluster, task, and service creation and deletion for Pushkin deployments
 * ECS is used to run containerized applications on AWS, and this module abstracts the setup and management of ECS resources
 * including clusters, task definitions, services, load balancers, and security groups.
 * Containers we run include the Pushkin API, worker, and any other services defined in the project.
 * @module ecs
 */

import { ECSClient, CreateClusterCommand } from "@aws-sdk/client-ecs";
import { EC2Client, DescribeSubnetsCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../../utils/aws-resources.js";
import { AWS_REGION } from "../../constants.js";
import { ensureBalancerSecurityGroup, ensureECSSecurityGroup } from "../security.js";
import { createECSTask } from "./tasks.js";
import { loadAwsConfig } from "../../utils/aws-config.js";

export { deleteStack, deleteCluster } from "./clusters.js";

/**
 * (Helper)
 * Asynchronously retrieves available subnets in the AWS zone and maps them by availability zone.
 * This is used to specify subnets when creating the load balancer and ECS tasks.
 * @param {string} useIAM - The IAM role to use for AWS API calls
 * @returns {Promise} A promise that resolves to an object mapping availability zones to subnet IDs
 */
async function getSubnets(useIAM) {
  console.log(`Retrieving subnets for AWS zone`);
  try {
    const factory = new AWSClientFactory(AWS_REGION, useIAM);
    const ec2Client = factory.createClient(EC2Client);
    const describeSubnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({}));
    const subnets = {};
    describeSubnetsResponse.Subnets.forEach((subnet) => {
      subnets[subnet.AvailabilityZone] = subnet.SubnetId;
    });
    return subnets;
  } catch (e) {
    console.error(`Failed to retrieve available subnets.`);
    throw e;
  }
}

/**
 * (Helper)
 * Get the default VPC ID for the current region
 * @param {string} useIAM - IAM profile name
 * @returns {Promise<string>} Default VPC ID
 */
async function getDefaultVPC(useIAM) {
  console.log("Getting default VPC");
  try {
    const factory = new AWSClientFactory(AWS_REGION, useIAM);
    const ec2Client = factory.createClient(EC2Client);
    const { Vpcs } = await ec2Client.send(new DescribeVpcsCommand({}));
    const defaultVPC = Vpcs.find((v) => v.IsDefault);
    if (!defaultVPC) throw new Error("No default VPC found in region");
    console.log("Default VPC:", defaultVPC.VpcId);
    return defaultVPC.VpcId;
  } catch (e) {
    console.error(`Unable to find VPC`);
    throw e;
  }
}

/**
 * Set up ECS cluster and related resources:
 * - Security groups
 * - Load balancers and target groups
 * - Network setup (VPC, subnets)
 * @param {string} projName - The name of the project
 * @param {string} useIAM - The IAM role to use
 * @param {string} DHID - The Docker Hub ID
 * @param {Promise} completedDBs - A promise that resolves when the databases are set up
 * @param {string} myCertificate - The certificate for the project
 * @returns {Promise} - A promise that resolves when the ECS setup is complete
 */
const setupECS = async (projName, useIAM, DHID, completedDBs, myCertificate) => {
  console.log(`Starting ECS setup`);

  const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

  // Start network lookups concurrently while security groups are being set up
  const subnetLookup = getSubnets(useIAM);
  const vpcLookup = getDefaultVPC(useIAM);
  const BalancerSecurityGroupID = await ensureBalancerSecurityGroup(useIAM, projName);
  const ecsSecurityGroupID = await ensureECSSecurityGroup(useIAM, projName);

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");

  let launchedECS;
  const zones = await subnetLookup;
  console.log(`Subnets identified`);
  let subnets;
  try {
    subnets = Object.keys(zones).map((z) => zones[z]);
  } catch (e) {
    console.error(`Problem extracting list of subnets in your zone from 'zones': `, zones);
    throw e;
  }

  const myVPC = await vpcLookup;
  try {
    console.log("Launching ECS cluster");
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ecsClient = factory.createClient(ECSClient);
    try {
      await ecsClient.send(
        new CreateClusterCommand({
          clusterName: ECSName,
          tags: [{ key: PROJECT_TAG_KEY, value: projName }],
        }),
      );
      console.log(`Created ECS cluster: ${ECSName}`);
      launchedECS = Promise.resolve();
    } catch (error) {
      if (error.name === "ClusterAlreadyExistsException") {
        console.log(`ECS cluster ${ECSName} already exists, continuing...`);
        launchedECS = Promise.resolve();
      } else {
        throw error;
      }
    }
  } catch (e) {
    console.error(`Unable to launch cluster ${ECSName}.`);
    throw e;
  }

  console.log(`Creating application load balancer`);
  const loadBalancerName = ECSName.concat("Balancer");

  try {
    console.log(`Updating awsResources.js with load balancer info`);
    updateAwsResourcesField("loadBalancerName", loadBalancerName);
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  let madeBalancer;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    madeBalancer = elbv2Client.send(
      new CreateLoadBalancerCommand({
        Name: loadBalancerName,
        Type: "application",
        Scheme: "internet-facing",
        Subnets: subnets,
        SecurityGroups: [BalancerSecurityGroupID],
        Tags: [{ Key: PROJECT_TAG_KEY, Value: projName }],
      }),
    );
  } catch (e) {
    console.error(`Unable to create application load balancer`);
    throw e;
  }

  let tempMakeTargetGroup;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    tempMakeTargetGroup = await elbv2Client.send(
      new CreateTargetGroupCommand({
        Name: loadBalancerName.concat("Targets").slice(0, 32),
        Protocol: "HTTP",
        Port: 80,
        VpcId: myVPC,
        TargetType: "ip", // Required for Fargate with awsvpc network mode
      }),
    );
  } catch (e) {
    console.error(`Unable to create target group`);
    throw e;
  }
  const targGroupARN = tempMakeTargetGroup.TargetGroups[0].TargetGroupArn;
  try {
    console.log(`Updating awsResources.js with target group info`);
    updateAwsResourcesField("targGroupARN", targGroupARN);
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  let aMadeBalancer = await madeBalancer; //need this for the next step
  const balancerARN = aMadeBalancer.LoadBalancers[0].LoadBalancerArn;
  const balancerEndpoint = aMadeBalancer.LoadBalancers[0].DNSName;
  const balancerZone = aMadeBalancer.LoadBalancers[0].CanonicalHostedZoneId;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    await elbv2Client.send(
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
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
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
  console.log("Creating ECS tasks");
  createdECSTasks = createECSTask(
    projName,
    useIAM,
    DHID,
    completedDBs,
    ECSName,
    targGroupARN,
    subnets,
    ecsSecurityGroupID,
  );
  await createdECSTasks;
  console.log(`Created ECS task definitions`);

  return [balancerEndpoint, balancerZone];
};

export { setupECS };
