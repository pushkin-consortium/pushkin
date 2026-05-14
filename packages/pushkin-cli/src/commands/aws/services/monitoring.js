/**
 * AWS Monitoring Service Management
 * Handles CloudWatch log groups and SSL certificate listing
 * @module monitoring
 */

import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { ACMClient, ListCertificatesCommand } from "@aws-sdk/client-acm";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION } from "../constants.js";

/**
 * Create CloudWatch log group for ECS.
 * @param {*} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<void>} - A promise that resolves when the log group is created
 */
const createLogGroup = async (useIAM, projName) => {
  const cloudWatchLogsClient = new AWSClientFactory(AWS_REGION, useIAM).createClient(
    CloudWatchLogsClient,
  );
  try {
    await cloudWatchLogsClient.send(new CreateLogGroupCommand({ logGroupName: `ecs/${projName}` }));
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.warn(
        `Log group ecs/${projName} already exists. Skipping creation. If this is a surprise, you should look into it.`,
      );
    } else {
      console.error(`Unable to create log group for ECS`);
      throw e;
    }
  }
  try {
    await cloudWatchLogsClient.send(
      new PutRetentionPolicyCommand({
        logGroupName: `ecs/${projName}`,
        retentionInDays: 7,
      }),
    );
  } catch (error) {
    console.error(`Unable to set retention policy for ECS log group: ${error}`);
    throw error;
  }
};

/**
 * List SSL certificates available in ACM, returned as a display-label → ARN map.
 * WHY: Separates AWS data fetching from interactive prompting; the caller
 * (user-input.js) owns the inquirer prompt.
 * @param {string} useIAM - The IAM role to use
 * @returns {Promise<Record<string, string>>} Map of display label to certificate ARN
 */
const listCertificates = async (useIAM) => {
  const acm = new AWSClientFactory(AWS_REGION, useIAM).createClient(ACMClient);
  try {
    const response = await acm.send(new ListCertificatesCommand({}));
    return response.CertificateSummaryList.reduce((acc, c) => {
      acc[`${c.DomainName} (Status: ${c.Status}) - ${c.CertificateArn.slice(-8)}`] =
        c.CertificateArn;
      return acc;
    }, {});
  } catch (error) {
    console.error(`Unable to get list of SSL certificates: ${error}`);
    throw error;
  }
};

export { createLogGroup, listCertificates };
