/**
 * AWS ECS Service Management
 * Orchestrates ECS cluster, task, and service creation and deletion for Pushkin deployments.
 * Abstracts the setup and management of ECS resources including clusters, task definitions,
 * services, load balancers, and security groups.
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
import { loadAwsConfig } from "../../utils/aws-config.js";
import { createECSTask } from "./tasks.js";

export { deleteStack, deleteCluster } from "./clusters.js";

/**
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
  } catch (error) {
    console.error(`Failed to retrieve available subnets: ${error}`);
    throw error;
  }
}

/**
 * Get the default VPC ID for the current region.
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
    console.error(`Unable to find VPC: ${error}`);
    throw error;
  }
}

/**
 * Set up ECS cluster and related resources:
 * - Security groups
 * - Network setup (VPC, subnets)
 * - Load balancers and target groups
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

  // 1: Network lookups + security groups
  // WHY: Subnets and VPC are needed later for both the load balancer and Fargate tasks.
  const subnetLookup = getSubnets(useIAM);
  const vpcLookup = getDefaultVPC(useIAM);
  const BalancerSecurityGroupID = await ensureBalancerSecurityGroup(useIAM, projName);
  const ecsSecurityGroupID = await ensureECSSecurityGroup(useIAM, projName);

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");

  const zones = await subnetLookup;
  console.log(`Subnets identified`);
  let subnets;
  try {
    subnets = Object.keys(zones).map((z) => zones[z]);
  } catch (error) {
    console.error(
      `Problem extracting list of subnets in your zone from 'zones': ${zones}\n${error}`,
    );
    throw error;
  }

  // 2: ECS cluster
  // WHY: ECS needs a cluster to run tasks in, and it's easier to manage resources when they're grouped in a cluster.
  // Just a logical namespace for our services — with Fargate there are no EC2 instances
  // to spin up, so this is nearly instant and idempotent across re-deploys.
  const myVPC = await vpcLookup;
  console.log("Launching ECS cluster");
  try {
    const factory = new AWSClientFactory(AWS_REGION, useIAM);
    const ecsClient = factory.createClient(ECSClient);
    await ecsClient.send(
      new CreateClusterCommand({
        clusterName: ECSName,
        tags: [{ key: PROJECT_TAG_KEY, value: projName }],
      }),
    );
    console.log(`Created ECS cluster: ${ECSName}`);
  } catch (error) {
    if (error.name === "ClusterAlreadyExistsException") {
      console.log(`ECS cluster ${ECSName} already exists, continuing...`);
    } else {
      console.error(`Unable to launch cluster ${ECSName}: ${error}`);
      throw error;
    }
  }

  // 3: Load balancer + target group
  // WHY: The load balancer is the public DNS entry point; the target group is the list of
  // Fargate task IPs it forwards to
  console.log(`Creating application load balancer`);
  const loadBalancerName = ECSName.concat("Balancer");

  try {
    updateAwsResourcesField("loadBalancerName", loadBalancerName);
  } catch (error) {
    console.error(`Unable to update awsResources.js: ${error}`);
  }

  const elbv2Client = new AWSClientFactory(AWS_REGION, useIAM).createClient(
    ElasticLoadBalancingV2Client,
  );

  const loadBalancerPromise = elbv2Client.send(
    new CreateLoadBalancerCommand({
      Name: loadBalancerName,
      Type: "application",
      Scheme: "internet-facing",
      Subnets: subnets,
      SecurityGroups: [BalancerSecurityGroupID],
      Tags: [{ Key: PROJECT_TAG_KEY, Value: projName }],
    }),
  );

  let targGroupARN;
  try {
    const targetGroupResponse = await elbv2Client.send(
      new CreateTargetGroupCommand({
        Name: loadBalancerName.concat("Targets").slice(0, 32),
        Protocol: "HTTP",
        Port: 80,
        VpcId: myVPC,
        TargetType: "ip", // Required for Fargate with awsvpc network mode
      }),
    );
    targGroupARN = targetGroupResponse.TargetGroups[0].TargetGroupArn;
  } catch (error) {
    console.error(`Unable to create target group: ${error}`);
    throw error;
  }

  try {
    updateAwsResourcesField("targGroupARN", targGroupARN);
  } catch (error) {
    console.error(`Unable to update awsResources.js: ${error}`);
  }

  let lb;
  try {
    lb = await loadBalancerPromise;
  } catch (error) {
    console.error(`Unable to create application load balancer: ${error}`);
    throw error;
  }
  const balancerARN = lb.LoadBalancers[0].LoadBalancerArn;
  const balancerEndpoint = lb.LoadBalancers[0].DNSName;
  const balancerZone = lb.LoadBalancers[0].CanonicalHostedZoneId;

  // 4: HTTP/HTTPS Listeners
  // WHY: Listeners tell the load balancer what to do with traffic on a given port.
  // Both HTTP and HTTPS just forward to the target group; HTTPS attaches the SSL cert.
  try {
    await elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTP",
        Port: 80,
        DefaultActions: [{ Type: "forward", TargetGroupArn: targGroupARN }],
      }),
    );
  } catch (error) {
    console.error(`Unable to create HTTP listener: ${error}`);
    throw error;
  }

  try {
    await elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTPS",
        Port: 443,
        Certificates: [{ CertificateArn: myCertificate }],
        DefaultActions: [{ Type: "forward", TargetGroupArn: targGroupARN }],
      }),
    );
    console.log(`Added HTTPS to load balancer`);
  } catch (error) {
    console.error(`Unable to add HTTPS to load balancer: ${error}`);
    throw error;
  }

  // 5: ECS tasks (RabbitMQ, API, experiment workers)
  // WHY: Workers need DB connection strings, so createECSTask internally waits on completedDBs
  // before deploying them. RabbitMQ and API deploy in parallel with the DB wait.
  console.log("Creating ECS tasks");
  await createECSTask(
    projName,
    useIAM,
    DHID,
    completedDBs,
    ECSName,
    targGroupARN,
    subnets,
    ecsSecurityGroupID,
  );
  console.log(`Created ECS task definitions`);

  return [balancerEndpoint, balancerZone];
};

export { setupECS };
