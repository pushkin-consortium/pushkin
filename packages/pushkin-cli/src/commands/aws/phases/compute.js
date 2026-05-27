/**
 * Compute Setup Phase
 * Handles ECS cluster, task definitions, and load balancer configuration
 * @module aws/phases/compute
 */

import { EC2Client, DescribeSubnetsCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { AWS_REGION } from "../constants.js";
import { ensureBalancerSecurityGroup, ensureECSSecurityGroup } from "../services/security.js";
import { createLoadBalancer } from "../services/elb.js";
import { createCluster } from "../services/ecs/clusters.js";
import { createECSTask } from "../services/ecs/tasks.js";

/**
 * Asynchronously retrieves available subnets in the AWS zone and maps them by availability zone.
 * WHY: Subnets are needed for both the load balancer and Fargate tasks to define the network environment they run in.
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
  } catch (error) {
    console.error(`Failed to retrieve available subnets:`, error);
    throw error;
  }
}

/**
 * Get the default VPC ID for the current region.
 * WHY: VPC is needed for both the load balancer and Fargate tasks to define the network environment they run in.
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
  } catch (error) {
    console.error(`Unable to find VPC:`, error);
    throw error;
  }
}

/**
 * Set up ECS compute resources:
 * - Security groups: one for the load balancer, one for ECS tasks
 * - Network setup (VPC, subnets): defines the network environment for the load balancer and Fargate tasks
 * - ECS cluster: resources that will run the Fargate tasks for the API, RabbitMQ, and experiment workers
 * - Load balancer: the public DNS entry point for the deployed API and workers
 * - Target groups: defines the list of IPs the load balancer forwards to (the Fargate tasks)
 * - HTTP/HTTPS listeners: tells the load balancer to forward incoming traffic on ports 80 and 443 to the target group
 * - ECS task definitions and services: defines how to run the API, RabbitMQ, and experiment workers on Fargate
 * @param {string} projName - The project name
 * @param {string} useIAM - The IAM role to use
 * @param {string} DHID - The Docker Hub ID
 * @param {Promise} completedDBs - A promise that resolves when the databases are set up
 * @param {string} myCertificate - The ACM certificate ARN
 * @returns {Promise<{balancerEndpoint: string, balancerZone: string}>}
 */
export async function setupCompute(projName, useIAM, DHID, completedDBs, myCertificate) {
  console.log(`Starting ECS setup`);

  const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

  // Network lookups (VPC, subnets) + security groups
  const subnetLookup = getSubnets(useIAM);
  const vpcLookup = getDefaultVPC(useIAM);
  const BalancerSecurityGroupID = await ensureBalancerSecurityGroup(useIAM, projName);
  const ecsSecurityGroupID = await ensureECSSecurityGroup(useIAM, projName);

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");

  const zones = await subnetLookup;
  console.log(`Subnets identified`);
  const subnets = Object.values(zones);

  // Create ECS cluster
  const myVPC = await vpcLookup;
  await createCluster(ECSName, projName, useIAM, PROJECT_TAG_KEY);

  // Create load balancer, target group, and HTTP/HTTPS listeners
  const loadBalancerName = ECSName.concat("Balancer");
  const { balancerEndpoint, balancerZone, targetGroupARN } = await createLoadBalancer(useIAM, {
    name: loadBalancerName,
    vpcId: myVPC,
    subnets,
    securityGroupId: BalancerSecurityGroupID,
    certificateArn: myCertificate,
    projName,
    projectTagKey: PROJECT_TAG_KEY,
  });

  // Create ECS tasks (RabbitMQ, API, experiment workers)
  console.log("Creating ECS tasks");
  await createECSTask(
    projName,
    useIAM,
    DHID,
    completedDBs,
    ECSName,
    targetGroupARN,
    subnets,
    ecsSecurityGroupID,
    myVPC,
  );
  console.log(`Created ECS task definitions`);

  return { balancerEndpoint, balancerZone };
}
