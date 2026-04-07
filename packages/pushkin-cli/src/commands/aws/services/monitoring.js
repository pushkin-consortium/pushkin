import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { ACMClient, ListCertificatesCommand } from "@aws-sdk/client-acm";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION } from "../constants.js";
import inquirer from "inquirer";

/**
 * Create CloudWatch log group for ECS
 * @param {*} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<void>} - A promise that resolves when the log group is created
 */
const createLogGroup = async (useIAM, projName) => {
  //Log group for ECS
  let stdOut;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const cloudWatchLogsClient = factory.createClient(CloudWatchLogsClient);
    await cloudWatchLogsClient.send(
      new CreateLogGroupCommand({
        logGroupName: `ecs/${projName}`,
      }),
    );
    stdOut = { stdout: "" };
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Log group ecs/${projName} for ECS already exists. Skipping creation.\n
      If this is a surprise, you should look into it.`,
      );
    } else {
      console.error(`Unable to create log group for ECS`);
      throw e;
    }
  }
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const cloudWatchLogsClient = factory.createClient(CloudWatchLogsClient);
    await cloudWatchLogsClient.send(
      new PutRetentionPolicyCommand({
        logGroupName: `ecs/${projName}`,
        retentionInDays: 7,
      }),
    );
    stdOut = { stdout: "" };
  } catch (e) {
    console.error(`Unable to set retention policy for ECS log group`);
    throw e;
  }
};

/**
 *
 * @param useIAM
 */
const chooseCertificate = async (useIAM) => {
  console.log("Setting up SSL for load-balancer");

  const profileName = useIAM;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const acm = factory.createClient(ACMClient);

  let certificates;
  try {
    const response = await acm.send(new ListCertificatesCommand({}));
    console.log(`Found ${response.CertificateSummaryList.length} total certificates`);

    // Show all certificates for debugging
    response.CertificateSummaryList.forEach((cert) => {
      console.log(
        `Certificate: ${cert.DomainName}, Status: ${cert.Status}, ARN: ${cert.CertificateArn}`,
      );
    });

    certificates = response.CertificateSummaryList.reduce((acc, c) => {
      acc[`${c.DomainName} (Status: ${c.Status}) - ${c.CertificateArn.slice(-8)}`] =
        c.CertificateArn;
      return acc;
    }, {});

    console.log(`Found ${Object.keys(certificates).length} total certificates`);
  } catch (e) {
    console.error(`Unable to get list of SSL certificates`);
    throw e;
  }

  console.log(`Choosing...`);
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
