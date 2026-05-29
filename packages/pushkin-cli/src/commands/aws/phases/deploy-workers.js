/**
 * AWS Workers Deployment Phase
 * Handles Docker image rebuilding, publishing to DockerHub, and API routing setup.
 * @module aws/phases/deploy-workers
 */

import fs from "graceful-fs";
import { rebuildWorker, publishToDocker } from "../../../utils/docker.js";
import { forwardAPI } from "../services/route53.js";

/**
 * Rebuild and publish Docker workers, then configure API routing.
 * @param {object} options
 * @param {string} options.DockerHubId
 * @param {string} options.projectName
 * @param {string} options.siteDomain
 * @param {string} options.experimentsDir
 * @param {Promise} options.configuredEcs - Promise resolving when ECS is configured
 * @param {Promise} options.deployedFrontEnd - Promise resolving when frontend is deployed (ensures Route53 hosted zone exists before API record is created)
 */
async function deployWorkers({
  DockerHubId,
  projectName,
  siteDomain,
  experimentsDir,
  configuredEcs,
  deployedFrontEnd,
}) {
  const experiments = fs.readdirSync(experimentsDir);
  const rebuiltWorkers = Promise.all(experiments.map(rebuildWorker));
  await publishToDocker(DockerHubId, rebuiltWorkers);

  await forwardAPI(configuredEcs, projectName, siteDomain, deployedFrontEnd);
}

export { deployWorkers };
