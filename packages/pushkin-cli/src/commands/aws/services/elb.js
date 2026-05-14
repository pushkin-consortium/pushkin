/**
 * AWS Elastic Load Balancer Management
 * @module elb
 */

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
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../utils/aws-resources.js";
import { AWS_REGION } from "../constants.js";

/**
 * Creates an ELBv2 client using the same region and IAM profile.
 */
const createELBv2Client = (useIAM) =>
  new AWSClientFactory(AWS_REGION, useIAM).createClient(ElasticLoadBalancingV2Client);

/**
 * Create an application load balancer, target groups, and HTTP/HTTPS listeners.
 * WHY:
 * - Load balancer: to use AWS's managed certificate for HTTPS, which requires an internet-facing load balancer
 * - Target groups: to forward traffic from the load balancer to the ECS service, and required for Fargate with awsvpc network mode
 * - HTTP listener: to redirect HTTP to HTTPS
 * - HTTPS listener: to serve traffic securely and use ACM certificate
 * @param {string} useIAM - IAM profile to use
 * @param {string} loadBalancerName - Name for the load balancer (and derived target group name)
 * @param {Array<string>} subnets - Subnet IDs to place the load balancer in
 * @param {string} securityGroupId - Security group ID for the load balancer
 * @param {string} vpcId - VPC ID for the target group
 * @param {string} certificateArn - ACM certificate ARN for the HTTPS listener
 * @param {string} projName - Project name (for tagging)
 * @param {string} projectTagKey - Tag key for identifying Pushkin resources
 * @returns {Promise<{balancerEndpoint: string, balancerZone: string, targGroupARN: string}>}
 */
const createLoadBalancer = async (
  useIAM,
  loadBalancerName,
  subnets,
  securityGroupId,
  vpcId,
  certificateArn,
  projName,
  projectTagKey,
) => {
  console.log(`Creating application load balancer`);
  const elbv2Client = createELBv2Client(useIAM);

  const loadBalancerPromise = elbv2Client.send(
    new CreateLoadBalancerCommand({
      Name: loadBalancerName,
      Type: "application",
      Scheme: "internet-facing",
      Subnets: subnets,
      SecurityGroups: [securityGroupId],
      Tags: [{ Key: projectTagKey, Value: projName }],
    }),
  );

  let targetGroupARN;
  try {
    const targetGroupResponse = await elbv2Client.send(
      new CreateTargetGroupCommand({
        Name: loadBalancerName.concat("Targets").slice(0, 32),
        Protocol: "HTTP",
        Port: 80,
        VpcId: vpcId,
        TargetType: "ip", // Required for Fargate with awsvpc network mode
      }),
    );
    targetGroupARN = targetGroupResponse.TargetGroups[0].TargetGroupArn;
  } catch (error) {
    console.error(`Unable to create target group: ${error}`);
    throw error;
  }

  try {
    updateAwsResourcesField("targetGroupARN", targetGroupARN);
  } catch (error) {
    console.error(`Unable to update awsResources.js: ${error}`);
  }

  let loadBalancer;
  try {
    loadBalancer = await loadBalancerPromise;
  } catch (error) {
    console.error(`Unable to create application load balancer: ${error}`);
    throw error;
  }
  const balancerARN = loadBalancer.LoadBalancers[0].LoadBalancerArn;
  const balancerEndpoint = loadBalancer.LoadBalancers[0].DNSName;
  const balancerZone = loadBalancer.LoadBalancers[0].CanonicalHostedZoneId;

  try {
    updateAwsResourcesField("loadBalancerName", loadBalancerName);
  } catch (error) {
    console.error(`Unable to update awsResources.js: ${error}`);
  }

  try {
    await elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTP",
        Port: 80,
        DefaultActions: [{ Type: "forward", TargetGroupArn: targetGroupARN }],
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
        Certificates: [{ CertificateArn: certificateArn }],
        DefaultActions: [{ Type: "forward", TargetGroupArn: targetGroupARN }],
      }),
    );
    console.log(`Added HTTPS to load balancer`);
  } catch (error) {
    console.error(`Unable to add HTTPS to load balancer: ${error}`);
    throw error;
  }

  return { balancerEndpoint, balancerZone, targetGroupARN: targetGroupARN };
};

/**
 * Delete all listeners on a load balancer, then poll until they are fully removed.
 * WHY: Listeners must be deleted before the load balancer can be deleted.
 * @param {string} loadBalancerArn
 * @param {string} useIAM
 */
const deleteAllListeners = async (loadBalancerArn, useIAM) => {
  const elbv2Client = createELBv2Client(useIAM);

  let listenerArns;
  try {
    const response = await elbv2Client.send(
      new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn }),
    );
    listenerArns = response.Listeners.map((l) => l.ListenerArn);
  } catch (error) {
    console.error(`Unable to list listeners for load balancer ${loadBalancerArn}: ${error}`);
    throw error;
  }

  if (listenerArns.length > 0) {
    await Promise.all(
      listenerArns.map((arn) => {
        console.log(`Deleting listener: ${arn}`);
        return elbv2Client.send(new DeleteListenerCommand({ ListenerArn: arn }));
      }),
    );
  }

  await createWaiter(
    { client: elbv2Client, maxWaitTime: 300, minDelay: 5, maxDelay: 5 },
    { LoadBalancerArn: loadBalancerArn },
    async (client, input) => {
      const { Listeners } = await client.send(new DescribeListenersCommand(input));
      if (Listeners.length === 0) {
        console.log("All listeners deleted.");
        return { state: WaiterState.SUCCESS };
      }
      console.log(`Waiting for ${Listeners.length} listeners to be deleted...`);
      return { state: WaiterState.RETRY };
    },
  );
};

/**
 * Delete load balancer and all of its listeners.
 * WHY: Load balancer must be deleted before target groups can be deleted, and listeners must be deleted before load balancer can be deleted.
 * @param {string} useIAM
 * @param killTag
 */
const deleteLoadBalancer = async (useIAM, killTag) => {
  // TODO: killize
  const elbv2Client = createELBv2Client(useIAM);

  let loadBalancerArns;
  try {
    const response = await elbv2Client.send(new DescribeLoadBalancersCommand({}));
    loadBalancerArns = response.LoadBalancers.map((loadBalancer) => loadBalancer.LoadBalancerArn);
  } catch (error) {
    if (error.name === "LoadBalancerNotFound") {
      console.warn(`No load balancers found. May have already been deleted. Skipping.`);
      return;
    }
    console.error(`Unable to list load balancers: ${error}`);
    throw error;
  }

  await Promise.all(
    loadBalancerArns.map(async (arn) => {
      console.log(`Deleting load balancer ${arn}`);
      await deleteAllListeners(arn, useIAM);
      try {
        await elbv2Client.send(new DeleteLoadBalancerCommand({ LoadBalancerArn: arn }));
      } catch (error) {
        console.error(`Unable to delete load balancer ${arn}: ${error}`);
        throw error;
      }
    }),
  );
};

/**
 * Delete all target groups after the load balancer has been deleted.
 * @param {string} useIAM
 * @param {Promise} deletedLoadBalancer
 */
const deleteTargetGroups = async (useIAM, deletedLoadBalancer) => {
  // TODO: killize
  await deletedLoadBalancer;

  const elbv2Client = createELBv2Client(useIAM);

  let targetGroupArns;
  try {
    const response = await elbv2Client.send(new DescribeTargetGroupsCommand({}));
    targetGroupArns = response.TargetGroups.map((tg) => tg.TargetGroupArn);
  } catch (error) {
    console.error(`Unable to list target groups: ${error}`);
    throw error;
  }

  if (targetGroupArns.length === 0) {
    console.log(`No target groups. Skipping.`);
    return;
  }

  await Promise.all(
    targetGroupArns.map(async (arn) => {
      try {
        await elbv2Client.send(new DeleteTargetGroupCommand({ TargetGroupArn: arn }));
      } catch (error) {
        console.error(`Unable to delete target group ${arn}: ${error}`);
        throw error;
      }
    }),
  );
};

export { createLoadBalancer, deleteLoadBalancer, deleteTargetGroups };
