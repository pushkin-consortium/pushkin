/**
 * Handles creation and deletion of AWS Elastic Load Balancers (ELBv2) and associated resources.
 * ELB: AWS service that automatically distributes incoming application traffic across multiple
 * targets, such as Amazon EC2 instances, containers, and IP addresses.
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
import { loadAwsConfig } from "../utils/aws-config.js";
import { updateAwsResourcesField } from "../utils/aws-resources.js";
import { AWS_REGION } from "../constants.js";

const createLoadBalancerClient = (useIAM) =>
  new AWSClientFactory(AWS_REGION, useIAM).createClient(ElasticLoadBalancingV2Client);

/**
 * Creates an application load balancer, target groups, and HTTP/HTTPS listeners.
 * WHY:
 * - Load balancer: to use AWS's managed certificate for HTTPS, which requires an internet-facing load balancer
 * - Target groups: to forward traffic from load balancer to ECS services (required for Fargate with awsvpc network mode)
 * - HTTP listener: to redirect HTTP to HTTPS
 * - HTTPS listener: to serve traffic securely and use AWS Certificate Manager (ACM) certificate
 * @param {string} useIAM - IAM profile to use
 * @param {object} options
 * @param {string} options.name - Name for the load balancer (and derived target group name)
 * @param {string} options.vpcId - VPC ID for the target group
 * @param {Array<string>} options.subnets - Subnet IDs to place the load balancer in
 * @param {string} options.securityGroupId - Security group ID for the load balancer
 * @param {string} options.certificateArn - ACM certificate ARN for the HTTPS listener
 * @param {string} options.projName - Project name (for tagging)
 * @param {string} options.projectTagKey - Tag key for identifying Pushkin resources
 * @returns {Promise<{balancerEndpoint: string, balancerZone: string, targetGroupARN: string}>}
 */
async function createLoadBalancer(
  useIAM,
  {
    name: loadBalancerName,
    vpcId,
    subnets,
    securityGroupId,
    certificateArn,
    projName,
    projectTagKey,
  },
) {
  console.log(`Creating application load balancer`);
  const loadBalancerClient = createLoadBalancerClient(useIAM);

  // Create target group first so a failure here doesn't orphan a load balancer
  let targetGroupARN;
  try {
    const targetGroupResponse = await loadBalancerClient.send(
      new CreateTargetGroupCommand({
        Name: loadBalancerName.concat("Targets").slice(0, 32), // AWS enforces a 32-char max for target group names
        Protocol: "HTTP",
        Port: 80,
        VpcId: vpcId,
        TargetType: "ip", // Required for Fargate with awsvpc network mode
      }),
    );
    targetGroupARN = targetGroupResponse.TargetGroups[0].TargetGroupArn;
  } catch (error) {
    console.error(`Unable to create target group:`, error);
    throw error;
  }

  try {
    updateAwsResourcesField("targetGroupARN", targetGroupARN);
  } catch (error) {
    console.error(`Unable to update awsResources.js:`, error);
  }

  let loadBalancer;
  try {
    loadBalancer = await loadBalancerClient.send(
      new CreateLoadBalancerCommand({
        Name: loadBalancerName,
        Type: "application",
        Scheme: "internet-facing",
        Subnets: subnets,
        SecurityGroups: [securityGroupId],
        Tags: [{ Key: projectTagKey, Value: projName }],
      }),
    );
  } catch (error) {
    console.error(`Unable to create application load balancer:`, error);
    throw error;
  }
  const balancerARN = loadBalancer.LoadBalancers[0].LoadBalancerArn;
  const balancerEndpoint = loadBalancer.LoadBalancers[0].DNSName;
  const balancerZone = loadBalancer.LoadBalancers[0].CanonicalHostedZoneId;

  try {
    updateAwsResourcesField("loadBalancerName", loadBalancerName);
  } catch (error) {
    console.error(`Unable to update awsResources.js:`, error);
  }

  try {
    await loadBalancerClient.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTP",
        Port: 80,
        DefaultActions: [
          {
            Type: "redirect",
            RedirectConfig: { Protocol: "HTTPS", Port: "443", StatusCode: "HTTP_301" },
          },
        ],
      }),
    );
  } catch (error) {
    console.error(`Unable to create HTTP listener:`, error);
    throw error;
  }

  try {
    await loadBalancerClient.send(
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
    console.error(`Unable to add HTTPS to load balancer:`, error);
    throw error;
  }

  return { balancerEndpoint, balancerZone, targetGroupARN };
}

/**
 * Delete all listeners on a load balancer, then poll until they are fully removed.
 * WHY: Listeners must be deleted before the load balancer can be deleted.
 * @param {string} loadBalancerArn
 * @param {string} useIAM
 * @returns {Promise<void>}
 */
async function deleteListeners(loadBalancerArn, useIAM) {
  const loadBalancerClient = createLoadBalancerClient(useIAM);

  let listenerArns;
  try {
    const response = await loadBalancerClient.send(
      new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn }),
    );
    listenerArns = (response.Listeners ?? []).map((l) => l.ListenerArn);
  } catch (error) {
    console.error(`Unable to list listeners for load balancer ${loadBalancerArn}:`, error);
    throw error;
  }

  if (listenerArns.length === 0) return;

  await Promise.all(
    listenerArns.map((arn) => {
      console.log(`Deleting listener: ${arn}`);
      return loadBalancerClient.send(new DeleteListenerCommand({ ListenerArn: arn }));
    }),
  );

  const { listenerDeletion } = loadAwsConfig().timeouts.elb;
  try {
    await createWaiter(
      {
        client: loadBalancerClient,
        maxWaitTime: listenerDeletion.maxWaitTime,
        minDelay: listenerDeletion.checkInterval,
        maxDelay: listenerDeletion.checkInterval,
      },
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
  } catch {
    console.warn(
      `Listeners may not be fully deleted after ${listenerDeletion.maxWaitTime}s. Continuing anyway.`,
    );
  }
}

/**
 * Delete all load balancers in the account and their listeners.
 * WHY: Load balancer must be deleted before target groups can be deleted, and listeners must be deleted before load balancer can be deleted.
 * @param {string} useIAM
 */
async function deleteLoadBalancer(useIAM) {
  // TODO: killize
  const loadBalancerClient = createLoadBalancerClient(useIAM);

  let loadBalancerArns;
  try {
    const response = await loadBalancerClient.send(new DescribeLoadBalancersCommand({}));
    loadBalancerArns = (response.LoadBalancers ?? []).map(
      (loadBalancer) => loadBalancer.LoadBalancerArn,
    );
  } catch (error) {
    console.error(`Unable to list load balancers:`, error);
    throw error;
  }

  if (loadBalancerArns.length === 0) {
    console.log(`No load balancers found. Skipping.`);
    return;
  }

  await Promise.all(
    loadBalancerArns.map(async (arn) => {
      console.log(`Deleting load balancer ${arn}`);
      await deleteListeners(arn, useIAM);
      try {
        await loadBalancerClient.send(new DeleteLoadBalancerCommand({ LoadBalancerArn: arn }));
      } catch (error) {
        console.error(`Unable to delete load balancer ${arn}:`, error);
        throw error;
      }
    }),
  );
}

/**
 * Delete all target groups after the load balancer has been deleted.
 * @param {string} useIAM
 * @param {Promise} deletedLoadBalancer
 */
async function deleteTargetGroups(useIAM, deletedLoadBalancer) {
  // TODO: killize
  await deletedLoadBalancer;

  const loadBalancerClient = createLoadBalancerClient(useIAM);

  let targetGroupArns;
  try {
    const response = await loadBalancerClient.send(new DescribeTargetGroupsCommand({}));
    targetGroupArns = (response.TargetGroups ?? []).map((tg) => tg.TargetGroupArn);
  } catch (error) {
    console.error(`Unable to list target groups:`, error);
    throw error;
  }

  if (targetGroupArns.length === 0) {
    console.log(`No target groups. Skipping.`);
    return;
  }

  await Promise.all(
    targetGroupArns.map(async (arn) => {
      return loadBalancerClient.send(new DeleteTargetGroupCommand({ TargetGroupArn: arn }));
    }),
  );
}

export { createLoadBalancer, deleteLoadBalancer, deleteTargetGroups };
