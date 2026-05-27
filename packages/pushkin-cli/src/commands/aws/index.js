import { v4 as uuid } from "uuid";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import {
  verifyAwsProfile,
  loadDeploymentConfig,
  gatherUserInput,
  updateDeploymentConfig,
} from "./phases/setup.js";
import { provisionInfrastructure } from "./phases/infrastructure.js";
import { setupCompute } from "./phases/compute.js";
import { setupDatabases } from "./phases/database-setup.js";
import { deployApplication } from "./phases/deployment.js";
import { cleanupResources } from "./phases/cleanup.js";
import { listAllResources, getProjectStatus } from "./phases/status.js";
import { updatePushkinJs } from "../prep/index.js";

export { createAutoScale } from "./subcommands/autoscale.js";
export { getProjectStatus as awsStatus };

/**
 *
 */
async function awsInit(projectName, s3BucketName, awsProfile, DHID) {
  await verifyAwsProfile(awsProfile);
  const config = loadDeploymentConfig();

  const { siteDomain: domain, sslCertificate: certificate } = await gatherUserInput(awsProfile);

  await updateDeploymentConfig(config, projectName, s3BucketName, domain);
  updatePushkinJs();

  // 4. Core infrastructure: security groups, databases, CloudWatch log group, frontend build
  //    Databases take by far the longest — start them as early as possible
  const { completedDBs, builtFrontEnd } = await provisionInfrastructure(
    config,
    awsProfile,
    projectName,
  );

  // 5. ECS setup, DB migrations, and application deployment all run in parallel.
  //    deployApplication publishes Docker workers internally and must finish before ECS
  //    tasks can successfully pull images; setupCompute creates the service definitions
  //    (ECS task startup has enough latency that images will be available in practice).
  const computeResult = setupCompute(projectName, awsProfile, DHID, completedDBs, certificate);
  const dbSetup = setupDatabases(completedDBs);
  const deployed = deployApplication({
    config,
    DHID,
    projectName,
    s3BucketName: s3BucketName,
    awsProfile,
    domain,
    certificate,
    builtFrontEnd,
    configuredECS: computeResult,
  });

  await Promise.all([computeResult, dbSetup, deployed]);
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

  if (pushkinConfig.productionDBs) {
    Object.keys(pushkinConfig.productionDBs).forEach((db) => {
      pushkinConfig.productionDBs[db].name = null;
      pushkinConfig.productionDBs[db].url = null;
      pushkinConfig.productionDBs[db].pass = null;
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
async function awsArmageddon(awsProfile, killType) {
  await cleanupResources(awsProfile, killType);
  await listAllResources(awsProfile);
}

/**
 *
 */
async function awsList(awsProfile) {
  return listAllResources(awsProfile);
}

export { awsInit, nameProject, addIAM, awsArmageddon, awsList };
