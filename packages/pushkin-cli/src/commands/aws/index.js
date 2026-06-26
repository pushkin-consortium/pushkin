import { configureDeployment } from "./phases/configure-deployment.js";
import { provisionDbs } from "./phases/provision-databases.js";
import { setupBackend } from "./phases/provision-backend.js";
import { migrateDbs } from "./phases/migrate-databases.js";
import { deployFrontEnd } from "./phases/deploy-frontend.js";
import { deployWorkers } from "./phases/deploy-workers.js";
import { cleanupResources } from "./phases/cleanup.js";
import { listAllResources, getProjectStatus } from "./phases/status.js";
import { verifyAwsProfileName } from "./services/security.js";
import { buildFrontend } from "./services/s3.js";
import { readAwsResources, writeAwsResources } from "./utils/aws-resources.js";
import { updatePushkinJs } from "../prep/index.js";

export { createAutoScale } from "./subcommands/autoscale.js";
export { getProjectStatus as awsStatus };

/**
 *  Initialize a new Pushkin project on AWS, including S3 bucket, CloudFront distribution, RDS databases, and ECS backend.
 * @param {string} projectName
 * @param {string} s3BucketName
 * @param {string} DockerHubId
 */
async function awsInit(projectName, s3BucketName, DockerHubId) {
  await verifyAwsProfileName();
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
async function addIAM(iam) {
  const awsResources = readAwsResources();
  awsResources.iam = iam;
  writeAwsResources(awsResources);
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

export { awsInit, addIAM, awsArmageddon, awsList };
