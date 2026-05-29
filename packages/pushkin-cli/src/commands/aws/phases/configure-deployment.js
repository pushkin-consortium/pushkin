/**
 * AWS Deployment Configuration Phase
 * Handles gathering user input for domain and SSL certificate, and updates the pushkin.yaml configuration file accordingly.
 * @module aws/phases/configure-deployment
 */
import inquirer from "inquirer";
import { loadPushkinConfig, savePushkinConfig } from "../../../utils/pushkin-config.js";
import { listDomains } from "../services/route53.js";
import { listCertificates } from "../services/security.js";

async function chooseSiteDomain() {
  const NO_CUSTOM_DOMAIN = "No custom domain (use auto-generated URL)";
  const ENTER_CUSTOM_DOMAIN = "Enter a custom domain/subdomain";
  let domains = [NO_CUSTOM_DOMAIN];

  console.log("Choosing domain name for site:");
  try {
    const listDomainsResponse = await listDomains();
    listDomainsResponse.Domains.forEach((domain) => {
      domains.push(domain.DomainName);
    });
  } catch (error) {
    console.warn(`Unable to get list of registered domains from AWS:`, error);
  }

  domains.push(ENTER_CUSTOM_DOMAIN);

  const domainUserInput = await inquirer.prompt([
    {
      type: "list",
      name: "domain",
      choices: domains,
      default: 0,
      message: "Which domain would you like to use for your site?",
    },
  ]);

  if (domainUserInput.domain === ENTER_CUSTOM_DOMAIN) {
    const customDomainInput = await inquirer.prompt([
      {
        type: "input",
        name: "customDomain",
        message: "Enter your custom domain or subdomain (e.g., subdomain.example.com):",
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return "Domain cannot be empty";
          }
          return true;
        },
      },
    ]);
    return customDomainInput.customDomain;
  }

  if (domainUserInput.domain === NO_CUSTOM_DOMAIN) return null;
  return domainUserInput.domain;
}

async function chooseSSLCertificate() {
  console.log("Choosing SSL certificate for secure HTTPS connections:");
  let certificates;
  try {
    certificates = await listCertificates();
  } catch (error) {
    console.error(`Unable to list certificates from AWS:`, error);
    throw error;
  }
  const certificateUserInput = await inquirer.prompt([
    {
      type: "list",
      name: "certificate",
      choices: Object.keys(certificates),
      default: 0,
      message:
        "Which SSL certificate would you like to use for your site?" +
        " (Note: Only ISSUED certificates work for ALB)",
    },
  ]);
  return certificates[certificateUserInput.certificate];
}

async function gatherUserInput() {
  const domain = await chooseSiteDomain();
  // Default Cloudfront certificate will be used if no custom domain is chosen
  const certificate = domain ? await chooseSSLCertificate() : null;
  return { siteDomain: domain, sslCertificate: certificate };
}

async function updateDeploymentConfig(
  pushkinConfig,
  projectName,
  s3BucketName,
  siteDomain,
  sslCertificate,
) {
  pushkinConfig.info.projectName = projectName;
  pushkinConfig.info.s3BucketName = s3BucketName;
  pushkinConfig.info.rootDomain = siteDomain;
  pushkinConfig.info.sslCertificate = sslCertificate;

  if (pushkinConfig.databases?.production) {
    for (const db of Object.values(pushkinConfig.databases.production)) {
      db.name = null;
      db.url = null;
      db.pass = null;
      // Leave port and user in place, since those are unlikely to change
    }
  }

  await savePushkinConfig(pushkinConfig);

  return pushkinConfig;
}

/**
 * Configure deployment settings by gathering user input and updating pushkin.yaml.
 * @param {string} projectName
 * @param {string} s3BucketName
 */
async function configureDeployment(projectName, s3BucketName) {
  const pushkinConfig = loadPushkinConfig();
  const { siteDomain, sslCertificate } = await gatherUserInput();
  const updatedConfig = await updateDeploymentConfig(
    pushkinConfig,
    projectName,
    s3BucketName,
    siteDomain,
    sslCertificate,
  );
  return { updatedConfig, siteDomain, sslCertificate };
}

export { configureDeployment };
