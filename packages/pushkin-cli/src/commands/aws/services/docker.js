import { execSync } from "child_process";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { exec } from "../constants.js";
import { readConfig } from "../../prep/index.js";

/**
 * Publish Docker images to DockerHub
 * @param {string} DHID - The DockerHub ID
 * @param {Promise} rebuiltWorkers - A promise that resolves when the workers are rebuilt
 * @returns {Promise} - A promise that resolves when the images are published
 */
const publishToDocker = async (DHID, rebuiltWorkers) => {
  console.log("Publishing images to DockerHub");
  console.log("Building API");
  try {
    execSync(
      `docker buildx build --platform linux/amd64 -t ${DHID}/api:latest pushkin/api --load`,
      { cwd: process.cwd() },
    );
  } catch (e) {
    console.error(`Problem building API`);
    throw e;
  }
  console.log("Pushing API to DockerHub");
  let pushedAPI;
  try {
    pushedAPI = exec(`docker push ${DHID}/api:latest`, { cwd: process.cwd() });
  } catch (e) {
    console.error(`Couldn't push API to DockerHub`);
    throw e;
  }

  //note: don't need to rebuild server, because we use S3
  let docker_compose;
  try {
    docker_compose = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "pushkin/docker-compose.dev.yml"), "utf8"),
    );
  } catch (e) {
    console.error("Failed to load the docker-compose. That is extremely odd.");
    throw e;
  }

  /**
   * Push workers to DockerHub
   * @param {string} s - The service name
   * @returns {Promise<string>} - A promise that resolves when the workers of the service is pushed
   */
  const pushWorkers = async (s) => {
    const service = docker_compose.services[s];
    if (service.labels == null) {
      // not a worker
      return "";
    }
    if (service.labels.isPushkinWorker != true) {
      // not a worker
      return "";
    }

    console.log(`Pushkin ${s}`);
    try {
      const imageName = service.image.split(":")[0];
      execSync(`docker tag ${service.image} ${DHID}/${imageName}:latest`);
    } catch (e) {
      console.error(`Unable to tag image ${service.image}`);
      throw e;
    }
    try {
      const imageName = service.image.split(":")[0];
      return exec(`docker push ${DHID}/${imageName}:latest`);
    } catch (e) {
      console.error(`Unable to push image ${service.image}`);
      throw e;
    }
  };

  await rebuiltWorkers; //can't push until these are built

  let pushedWorkers;
  try {
    pushedWorkers = Object.keys(docker_compose.services).map(pushWorkers);
  } catch (e) {
    console.log(`Unable to push worker images to DockerHub`);
    throw e;
  }

  return Promise.all([pushedAPI, pushedWorkers]);
};

/**
 *
 * @param exp
 */
const rebuildWorker = async function (exp) {
  let pushkinConfig;
  let stdOut;
  try {
    stdOut = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(stdOut);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }
  console.log(`Rebuilding AWS-compatible worker for`, exp);
  const expDir = path.join(path.join(process.cwd(), pushkinConfig.experimentsDir), exp);
  if (!fs.lstatSync(expDir).isDirectory()) return "";
  let expConfig;
  try {
    expConfig = readConfig(expDir);
  } catch (err) {
    console.error(`Failed to read experiment config file for `.concat(exp));
    throw err;
  }
  const workerConfig = expConfig.worker;
  const workerName = `${exp}_worker`.toLowerCase(); //Docker names must all be lower case
  const workerLoc = path.join(expDir, workerConfig.location).replace(/ /g, "\\ "); //handle spaces in path

  let workerBuild;
  try {
    workerBuild = exec(
      `docker buildx build --platform linux/amd64 ${workerLoc} -t ${workerName} --load`,
    );
  } catch (e) {
    console.error(`Problem building worker for ${exp}`);
    throw e;
  }
  return workerBuild;
};
// Export all functions
export { publishToDocker, rebuildWorker };
