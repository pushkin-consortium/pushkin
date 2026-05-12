/**
 * ECS Service CRUD Operations
 * Handles creating, updating, and deleting ECS services for Pushkin deployments
 * @module ecs/services
 */

import path from "path";
import {
  ECSClient,
  DescribeServicesCommand,
  UpdateServiceCommand,
  CreateServiceCommand,
  ListServicesCommand,
  DeleteServiceCommand,
} from "@aws-sdk/client-ecs";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { writeFile } from "../../../../utils/file.js";
import { AWS_REGION } from "../../constants.js";

/**
 * Create or update an ECS Fargate service.
 * @param {string} serviceName - Name of the service
 * @param {string} taskDefArn - Task definition ARN
 * @param {string} clusterName - ECS cluster name
 * @param {string} targetGroupArn - Optional target group ARN for load balancing
 * @param {string} containerName - Container name for load balancer
 * @param {number} containerPort - Container port for load balancer
 * @param {Array<string>} subnets - Subnet IDs for Fargate tasks
 * @param {string} securityGroup - Security group ID for Fargate tasks
 * @param {string} useIAM - IAM profile to use
 * @returns {Promise<object>} Service creation/update response
 */
const createECSService = async (
  serviceName,
  taskDefArn,
  clusterName,
  targetGroupArn = null,
  containerName = null,
  containerPort = null,
  subnets = [],
  securityGroup = null,
  useIAM,
) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const ecsClient = factory.createClient(ECSClient);

  // First check if service already exists
  try {
    const describeResponse = await ecsClient.send(
      new DescribeServicesCommand({
        cluster: clusterName,
        services: [serviceName],
      }),
    );

    const existingService = describeResponse.services?.[0];
    if (existingService && existingService.status !== "INACTIVE") {
      console.log(`Service ${serviceName} already exists, updating with new task definition...`);

      const updateResponse = await ecsClient.send(
        new UpdateServiceCommand({
          cluster: clusterName,
          service: serviceName,
          taskDefinition: taskDefArn,
          forceNewDeployment: true,
        }),
      );

      console.log(`Updated ECS service: ${serviceName}`);
      return updateResponse.service;
    }
  } catch (error) {
    if (error.name !== "ServiceNotFoundException") {
      console.warn(`Note: Could not check for existing service: ${error.message}`);
    }
  }

  // Service doesn't exist, create it
  const serviceParams = {
    cluster: clusterName,
    serviceName,
    taskDefinition: taskDefArn,
    launchType: "FARGATE", // Using Fargate launch type
    desiredCount: 1, // Fargate uses REPLICA scheduling with desired count
    deploymentConfiguration: {
      maximumPercent: 200,
      minimumHealthyPercent: 100,
    },
    // Fargate requires awsvpc network configuration
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: subnets,
        securityGroups: securityGroup ? [securityGroup] : [],
        assignPublicIp: "ENABLED", // Required for pulling images from DockerHub
      },
    },
  };

  // Add load balancer configuration if provided
  if (targetGroupArn && containerName && containerPort) {
    serviceParams.loadBalancers = [
      {
        targetGroupArn,
        containerName,
        containerPort,
      },
    ];
  }

  try {
    const command = new CreateServiceCommand(serviceParams);
    const response = await ecsClient.send(command);
    console.log(`Created ECS service: ${serviceName}`);
    return response.service;
  } catch (error) {
    console.error(`Service: ${serviceName}`);
    console.error(`Error:`, error);
    if (error.$metadata) {
      console.error(`HTTP Status: ${error.$metadata.httpStatusCode}`);
    }
    console.error(`\nService Parameters:`);
    console.error(JSON.stringify(serviceParams, null, 2));

    // Also write to a debug file
    const debugPath = path.join(process.cwd(), "ecs-service-error.json");
    try {
      writeFile(
        debugPath,
        JSON.stringify(
          {
            serviceName,
            error: {
              name: error.name,
              message: error.message,
              metadata: error.$metadata,
            },
            serviceParams,
          },
          null,
          2,
        ),
      );
      console.log(`Debug info written to: ${debugPath}`);
    } catch (error) {
      console.error(`Failed to write debug info to file: ${error}`);
      throw error;
    }
  }
};

/**
 * Delete all services in an ECS cluster, waiting until they are fully removed.
 * @param {string} clusterName - ECS cluster name or ARN
 * @param {string} useIAM - IAM profile to use
 * @returns {Promise<boolean>} True when all services are deleted
 */
const deleteAllServices = async (clusterName, useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const ecsClient = factory.createClient(ECSClient);

  let serviceArns;
  try {
    const response = await ecsClient.send(new ListServicesCommand({ cluster: clusterName }));
    serviceArns = response.serviceArns;
  } catch (error) {
    console.error(`Unable to list services for cluster ${clusterName}: ${error}`);
    throw error;
  }

  if (serviceArns.length > 0) {
    await Promise.all(
      serviceArns.map((service) => {
        console.log(`Deleting service: ${service}`);
        return ecsClient.send(
          new DeleteServiceCommand({ cluster: clusterName, service: service, force: true }),
        );
      }),
    );
  }

  // Poll until all services are fully removed
  while (true) {
    let remaining;
    try {
      const response = await ecsClient.send(new ListServicesCommand({ cluster: clusterName }));
      remaining = response.serviceArns;
    } catch (error) {
      console.error(`Unable to list services for cluster ${clusterName}: ${error}`);
      throw error;
    }

    if (remaining.length === 0) break;

    console.log(`Waiting for ${remaining.length} services to be deleted...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log("All services have been deleted.");
  return true;
};

export { createECSService, deleteAllServices };
