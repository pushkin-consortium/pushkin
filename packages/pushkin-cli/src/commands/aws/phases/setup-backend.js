/**
 * AWS Deployment Setup Backend Phase
 * Handles ECS cluster, task definitions, and load balancer configuration.
 * @module aws/phases/setup-backend
 */

import { getDefaultVpc, getSubnets } from "../services/network.js";
import { ensureBalancerSecurityGroup, ensureEcsSecurityGroup } from "../services/security.js";
import { createLoadBalancer } from "../services/elb.js";
import { createCluster } from "../services/ecs/clusters.js";
import { createEcsTask } from "../services/ecs/tasks.js";

/**
 * Set up backend ECS resources:
 * - Networking (VPC, subnets): defines the network environment for the load balancer and Fargate tasks
 * - Security groups: one for the load balancer, one for ECS tasks
 * - ECS cluster: resources that will run the Fargate tasks for the API, RabbitMQ, and experiment workers
 * - Load balancer: the public DNS entry point for the deployed API and workers
 * - ECS task definitions and services: defines how to run the API, RabbitMQ, and experiment workers on Fargate
 * @param {string} awsProfileName - AWS IAM profile to use for authentication
 * @param {string} projectName - The project name
 * @param {string} DHID - Docker Hub ID to pull images from Docker with
 * @param {string} sslCertificate - The SSL certificate for terminating HTTPS traffic at the load balancer
 * @param {Promise} dbSetup - A promise that resolves when databases are set up
 * @returns {Promise<{loadBalancerEndpoint: string, loadBalancerZone: string}>}
 */
export async function setupBackend(awsProfileName, projectName, DHID, sslCertificate, dbSetup) {
  const vpcLookup = getDefaultVpc(awsProfileName);
  const subnetLookup = getSubnets(awsProfileName);
  const [loadBalancerSecurityGroupId, ecsSecurityGroupId] = await Promise.all([
    ensureBalancerSecurityGroup(awsProfileName, projectName),
    ensureEcsSecurityGroup(awsProfileName, projectName),
  ]);
  const vpcId = await vpcLookup;
  const subnets = Object.values(await subnetLookup);

  const ecsName = projectName.replace(/[^A-Za-z0-9]/g, "");

  const [{ loadBalancerEndpoint, loadBalancerZone, targetGroupArn }] = await Promise.all([
    createLoadBalancer(awsProfileName, {
      name: ecsName.concat("Balancer").slice(0, 32),
      vpcId,
      subnets,
      securityGroupId: loadBalancerSecurityGroupId,
      sslCertificate,
      projectName,
    }),
    createCluster(awsProfileName, ecsName, projectName),
  ]);

  await createEcsTask(awsProfileName, {
    ecsName,
    vpcId,
    subnets,
    securityGroupId: ecsSecurityGroupId,
    DHID,
    targetGroupArn,
    dbSetup,
    projectName,
  });

  return { loadBalancerEndpoint, loadBalancerZone };
}
