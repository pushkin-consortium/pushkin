/**
 * Application Deployment Phase
 * Handles Docker image publishing, worker rebuilds, and frontend deployment
 * @module aws/phases/deployment
 */

import fs from "graceful-fs";
import path from "path";
import { publishToDocker, rebuildWorker } from "../../../utils/docker.js";
import { deployFrontEnd } from "./init.js";
import { forwardAPI } from "../services/route53.js";

/**
 * Build and publish Docker workers for all experiments
 * @param {object} config - Pushkin configuration
 * @param {string} DHID - DockerHub ID
 * @returns {Promise<void>}
 */
async function buildAndPublishWorkers(config, DHID) {
  const expDirs = fs.readdirSync(path.join(process.cwd(), config.experimentsDir));

  const rebuiltWorkers = Promise.all(expDirs.map(rebuildWorker));
  return publishToDocker(DHID, rebuiltWorkers);
}

/**
 * Deploy application (Docker workers + frontend + API forwarding)
 * @param {object} params - Deployment parameters
 * @param {object} params.config - Pushkin configuration
 * @param {string} params.DHID - DockerHub ID
 * @param {string} params.projectName - Project name
 * @param {string} params.s3BucketName - S3 bucket name
 * @param {string} params.profileName - AWS profile name
 * @param {string} params.domain - Domain name
 * @param {string} params.certificate - SSL certificate ARN
 * @param {Promise} params.builtFrontEnd - Promise for built frontend
 * @param {Promise} params.configuredECS - Promise for configured ECS
 * @returns {Promise<{deployedFrontEnd: Promise, apiForwarded: Promise, cloudDomain: string}>}
 */
export async function deployApplication({
  config,
  DHID,
  projectName,
  s3BucketName,
  profileName,
  domain,
  certificate,
  builtFrontEnd,
  configuredEcs,
}) {
  console.log("Deploying application...");

  // Build and publish Docker workers
  await buildAndPublishWorkers(config, DHID);

  // Deploy frontend to S3/CloudFront
  const deployedFrontEnd = deployFrontEnd(
    projectName,
    s3BucketName,
    profileName,
    domain,
    certificate,
    builtFrontEnd,
  );

  // Set up API forwarding via Route53
  const apiForwarded = forwardAPI(
    configuredEcs,
    profileName,
    projectName,
    domain,
    deployedFrontEnd,
  );

  // Get CloudFront domain for default domain setup
  let cloudDomain;
  if (!domain) {
    const { loadBalancerEndpoint } = await configuredEcs;
    cloudDomain = await deployedFrontEnd;
    console.log(`Access your website at ${cloudDomain}`);
    console.log(
      `Be sure to update pushkin/front-end/src/config.js so that the api URL is ${loadBalancerEndpoint}.`,
    );
  }

  return { deployedFrontEnd, apiForwarded, cloudDomain };
}
