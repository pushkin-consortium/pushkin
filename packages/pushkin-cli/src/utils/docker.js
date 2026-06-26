/**
 * Pushkin Docker Utility
 * Utility module for building and publishing Docker images for Pushkin experiments.
 * @module docker
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { quote } from "shell-quote";
import { exec } from "../commands/aws/constants.js";
import { readConfig } from "../commands/prep/index.js";
import { loadPushkinConfig } from "./pushkin-config.js";

/**
 * Rebuilds the worker for a given experiment
 * WHY: Workers need to be built for Linux/AMD64 in order to be deployed to AWS, and the CLI may be
 * running on a different platform. By rebuilding the worker and pushing it to DockerHub, we can
 * ensure that the correct image is available for AWS to pull
 * @param {string} experiment – The experiment name for which to rebuild the worker
 * @param {boolean} verbose – Whether to log details
 * @returns {Promise} - A promise that resolves when the worker is rebuilt
 */
const rebuildWorker = async function (experiment, verbose = false) {
  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }
  console.log(`Building worker for ${experiment} (linux/amd64)...`);
  const expDir = path.join(pushkinConfig.experimentsDir, experiment);
  try {
    if (!fs.statSync(expDir).isDirectory()) return "";
  } catch (error) {
    console.warn(`Experiment directory not found: ${expDir}`, error);
    return "";
  }
  let expConfig;
  try {
    expConfig = readConfig(expDir);
  } catch (error) {
    console.error(`Failed to read experiment config file for ${experiment}:`, error);
    throw error;
  }
  const workerConfig = expConfig.worker;
  const workerName = `${experiment.toLowerCase()}_worker`; // Docker names must all be lower case
  const workerLoc = path.join(expDir, workerConfig.location);

  let workerBuild;
  try {
    const command = [
      "docker",
      "buildx",
      "build",
      "--platform",
      "linux/amd64",
      workerLoc,
      "-t",
      workerName,
      "--load",
    ];
    workerBuild = exec(quote(command));
  } catch (error) {
    console.error(`Problem building worker for ${experiment}:`, error);
    throw error;
  }
  return workerBuild;
};

/**
 * Publish Docker images to DockerHub:
 * 1. Pushkin API
 * 2. Experiment workers
 * WHY: This is necessary for deploying workers to AWS, since they need to be built for Linux/AMD64
 * and the CLI may be running on a different platform. By pushing to DockerHub, we can ensure that
 * the correct images are available for AWS to pull
 * @param {string} DockerHubId - The DockerHub ID
 * @param {Promise} rebuiltWorkers - Optional promise to wait for workers that need to be rebuilt
 * to finish rebuilding before pushing. The function itself pushes all workers on docker-compose
 * @param {boolean} verbose – Whether to log detailed steps
 * @returns {Promise} - A promise that resolves when the images are published
 */
const publishToDocker = async (
  DockerHubId,
  rebuiltWorkers = Promise.resolve(),
  verbose = false,
) => {
  if (!DockerHubId) {
    throw new Error(
      "DockerHub ID is required to publish images to Docker. Please set it using '$ pushkin setDockerHub' and try again.",
    );
  }
  console.log("Publishing images to DockerHub");

  console.log("Building API (linux/amd64)...");
  try {
    const imageTag = `${DockerHubId}/api:latest`;
    const buildCommand = quote([
      "docker",
      "buildx",
      "build",
      "--platform",
      "linux/amd64",
      "-t",
      imageTag,
      "pushkin/api",
      "--load",
    ]);
    await exec(buildCommand, { cwd: process.cwd() });
  } catch (error) {
    console.error(`Problem building API:`, error);
    throw error;
  }

  console.log(`Pushing ${DockerHubId}/api to DockerHub...`);
  let pushedAPI;
  try {
    const imageTag = `${DockerHubId}/api:latest`;
    const pushCommand = quote(["docker", "push", imageTag]);
    pushedAPI = exec(pushCommand, { cwd: process.cwd() }); // async; awaited in Promise.all at the end
  } catch (error) {
    console.error(`Couldn't push API to DockerHub:`, error);
    throw error;
  }
  // NOTE: don't need to build frontend because it's all compiled static files

  let docker_compose;
  try {
    const dockerComposePath = path.join(process.cwd(), "pushkin/docker-compose.dev.yml");
    docker_compose = jsYaml.load(fs.readFileSync(dockerComposePath, "utf8"));
  } catch (error) {
    console.error(`Failed to load the docker-compose:`, error);
    throw error;
  }

  const pushWorkers = async (s) => {
    const service = docker_compose.services[s];
    if (service.labels == null) {
      return "";
    }
    if (service.labels.isPushkinWorker != true) {
      return "";
    }

    console.log(`Pushing ${s} to DockerHub...`);
    try {
      const imageName = service.image.split(":")[0];
      const targetImage = `${DockerHubId}/${imageName}:latest`;
      const tagCommand = quote(["docker", "tag", service.image, targetImage]);
      const pushCommand = quote(["docker", "push", targetImage]);
      await exec(tagCommand);
      return exec(pushCommand); // async; awaited in Promise.all at the end
    } catch (error) {
      console.error(`Unable to tag and/or push image ${service.image}:`, error);
      throw error;
    }
  };

  await rebuiltWorkers; // Can't push workers until they finish building

  let pushedWorkers;
  try {
    pushedWorkers = Object.keys(docker_compose.services).map(pushWorkers);
  } catch (error) {
    console.error(`Unable to push worker images to DockerHub:`, error);
    throw error;
  }

  await Promise.all([pushedAPI].concat(pushedWorkers));
  console.log("✓ All images published to DockerHub");
};

// Export functions
export { rebuildWorker, publishToDocker };
