/**
 * AWS Monitoring Service Management
 * Handles CloudWatch log groups and SSL certificate selection
 * @module monitoring
 */

import inquirer from "inquirer";
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
 * Prompt the user to choose an SSL certificate for the load balancer.
 * @param useIAM
 */
const chooseCertificate = async (useIAM) => {
  console.log("Setting up SSL for load-balancer");

  const acm = new AWSClientFactory(AWS_REGION, useIAM).createClient(ACMClient);

  let certificates;
  try {
    const response = await acm.send(new ListCertificatesCommand({}));
    certificates = response.CertificateSummaryList.reduce((acc, c) => {
      acc[`${c.DomainName} (Status: ${c.Status}) - ${c.CertificateArn.slice(-8)}`] =
        c.CertificateArn;
      return acc;
    }, {});
    console.log(`Found ${Object.keys(certificates).length} certificates`);
  } catch (error) {
    console.error(`Unable to get list of SSL certificates: ${error}`);
    throw error;
  }

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "certificate",
      choices: Object.keys(certificates),
      default: 0,
      message:
        "Which SSL certificate would you like to use for your site? (Note: Only ISSUED certificates work for ALB)",
    },
  ]);

  return certificates[answers.certificate];
};
// Export all functions
export { createLogGroup, chooseCertificate };
