/**
 * AWS IAM Service Management
 * Handles IAM role creation and management for Pushkin deployments
 * @module iam
 */

import {
  IAMClient,
  GetRoleCommand,
  CreateRoleCommand,
  AttachRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION } from "../constants.js";

/**
 * Ensure the ECS task execution IAM role exists, creating it if necessary.
 * WHY: Fargate tasks need this role to pull container images from ECR and write logs to
 * CloudWatch. Without it, task registration succeeds but tasks fail to start.
 * @param {string} useIAM - IAM profile name
 * @param {boolean} verbose - Whether to log details
 * @returns {Promise<string>} ARN of the execution role
 */
const ensureECSTaskExecutionRole = async (useIAM, verbose = false) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const iamClient = factory.createClient(IAMClient);
  const roleName = "ecsTaskExecutionRole";

  try {
    const roleResponse = await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
    if (verbose) console.log(`ECS Task Execution Role already exists: ${roleResponse.Role.Arn}`);
    return roleResponse.Role.Arn;
  } catch (error) {
    if (error.name === "NoSuchEntityException") {
      if (verbose) console.log(`Creating ECS Task Execution Role: ${roleName}`);

      const assumeRolePolicyDocument = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "ecs-tasks.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      };

      const createRoleResponse = await iamClient.send(
        new CreateRoleCommand({
          RoleName: roleName,
          AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
          Description: "Allows ECS tasks to call AWS services on user's behalf",
        }),
      );
      const roleArn = createRoleResponse.Role.Arn;

      await iamClient.send(
        new AttachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        }),
      );
      console.log(`Created and configured ECS Task Execution Role: ${roleArn}`);
      return roleArn;
    } else {
      console.error(`Error checking for ECS Task Execution Role:`, error);
      throw error;
    }
  }
};

export { ensureECSTaskExecutionRole };
