/**
 * Handles CloudWatch log group creation for ECS services.
 * CloudWatch: Provides monitoring and observability of AWS resources and applications.
 * @module aws/services/monitoring
 */

import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { AWS_REGION } from "../constants.js";

function createCloudWatchClient(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(CloudWatchLogsClient);
}

/**
 * Create CloudWatch log group for ECS.
 * @param {string} awsProfileName - The IAM role to use
 * @param {string} projectName - The project name
 * @returns {Promise<void>} - A promise that resolves when the log group is created
 */
async function createLogGroup(awsProfileName, projectName) {
  const cloudWatchLogsClient = createCloudWatchClient(awsProfileName);
  const logGroupName = `ecs/${projectName}`;
  try {
    await cloudWatchLogsClient.send(new CreateLogGroupCommand({ logGroupName }));
  } catch (error) {
    if (error.name === "ResourceAlreadyExistsException") {
      console.warn(`Log group ${logGroupName} already exists. Skipping creation.`);
    } else {
      console.error(`Unable to create log group for ECS:`, error);
      throw error;
    }
  }
  try {
    await cloudWatchLogsClient.send(
      new PutRetentionPolicyCommand({
        logGroupName,
        retentionInDays: loadAwsConfig().cloudwatch.logRetentionDays,
      }),
    );
  } catch (error) {
    console.error(`Unable to set retention policy for ECS log group:`, error);
    throw error;
  }
}

export { createLogGroup };
