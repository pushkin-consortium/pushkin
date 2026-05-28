import { v4 as uuid } from "uuid";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { configureDeployment } from "./phases/configure-deployment.js";
import { provisionDbs } from "./phases/provision-databases.js";
import { setupBackend } from "./phases/provision-backend.js";
import { migrateDbs } from "./phases/migrate-databases.js";
import { deployFrontEnd } from "./phases/deploy-frontend.js";
import { deployWorkers } from "./phases/deploy-workers.js";
import { cleanupResources } from "./phases/cleanup.js";
import { listAllResources, getProjectStatus } from "./phases/status.js";
import { verifyawsProfileName } from "./services/security.js";
import { buildFrontend } from "./services/s3.js";
import { updatePushkinJs } from "../prep/index.js";

export { createAutoScale } from "./subcommands/autoscale.js";
export { getProjectStatus as awsStatus };

/**
 *
 */
async function awsInit(projectName, s3BucketName, DockerHubId) {
  await verifyawsProfileName();
  const { updatedConfig, siteDomain, sslCertificate } = await configureDeployment(
    projectName,
    s3BucketName,
  );

  updatePushkinJs(); // TODO: replace with passing built config to React using env vars

  // Phases are run in parallel and awaited internally only when needed
  const dbSetup = provisionDbs(projectName);
  const frontendBuild = buildFrontend(projectName);
  const backendSetup = setupBackend(projectName, DockerHubId, sslCertificate, dbSetup);
  const dbMigrations = migrateDbs(dbSetup);
  const frontendDeployment = deployFrontEnd({
    s3BucketName: s3BucketName,
    domainName: siteDomain,
    sslCertificate: sslCertificate,
    projectName: projectName,
    builtFrontEnd: frontendBuild,
  });
  const workersDeployment = deployWorkers({
    DockerHubId: DockerHubId,
    projectName: projectName,
    siteDomain: siteDomain,
    experimentsDir: updatedConfig.experimentsDir,
    configuredEcs: backendSetup,
    deployedFrontEnd: frontendDeployment,
  });

  await Promise.all([backendSetup, dbMigrations, frontendDeployment, workersDeployment]);

  if (!siteDomain) {
    const { loadBalancerEndpoint } = await backendSetup;
    const cloudDomain = await frontendDeployment;
    console.log(`Access your website at ${cloudDomain}`);
    console.log(
      `Be sure to update pushkin/front-end/src/config.js so that the api URL is ${loadBalancerEndpoint}.`,
    ); // TODO: replace with passing built config to React using env vars
  }
}

/**
 *
 */
async function nameProject(projectName) {
  console.log(`Recording project name`);
  let awsResources = {};
  let stdOut, temp, pushkinConfig;
  awsResources.name = projectName;
  // make a name for use as a bucket (AWS has rules)
  temp = projectName
    .replace(/[^\w\s]/g, "")
    .replace(/ /g, "-")
    .replace(/_/g, "-")
    .concat(uuid())
    .toLowerCase();
  if (temp.search(/[a-zA-Z]/g) != 0) {
    temp = "p".concat(temp);
  }
  awsResources.awsName = temp;
  try {
    stdOut = fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(
      `Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }

  console.log("Resetting db info");
  try {
    pushkinConfig = jsYaml.load(fs.readFileSync(path.join(process.cwd(), "pushkin.yaml"), "utf8"));
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
  }

  if (pushkinConfig.databases?.production) {
    Object.keys(pushkinConfig.databases.production).forEach((db) => {
      pushkinConfig.databases.production[db].name = null;
      pushkinConfig.databases.production[db].url = null;
      pushkinConfig.databases.production[db].pass = null;
      // Leave port and user in place, since those are unlikely to change
    });
    try {
      fs.promises.writeFile(
        path.join(process.cwd(), "pushkin.yaml"),
        jsYaml.dump(pushkinConfig),
        "utf8",
      );
    } catch (e) {
      console.error(`Couldn't save pushkin.yaml`);
      throw e;
    }
  }

  return awsResources.awsName;
}

/**
 *
 */
async function addIAM(iam) {
  let awsResources;
  try {
    awsResources = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
  } catch (e) {
    console.error(
      `Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }
  awsResources.iam = iam;
  try {
    fs.writeFileSync(
      path.join(process.cwd(), "awsResources.js"),
      jsYaml.dump(awsResources),
      "utf8",
    );
  } catch (e) {
    console.error(
      `Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`,
    );
    throw e;
  }
}

/**
 *
 */
async function awsArmageddon(killType) {
  await cleanupResources(killType);
  await listAllResources();
}

/**
 *
 */
async function awsList() {
  return listAllResources();
}

export { awsInit, nameProject, addIAM, awsArmageddon, awsList };
