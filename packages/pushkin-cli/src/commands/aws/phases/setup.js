/**
 * AWS Deployment Setup Phase
 * Handles gathering user input for domain and SSL certificate, and updates the pushkin.yaml configuration file accordingly.
 * @module aws/phases/setup
 */
import inquirer from "inquirer";
import { loadPushkinConfig, savePushkinConfig } from "../../../utils/pushkin-config.js";
import { listDomains } from "../services/route53.js";
import { verifyAwsProfile, listCertificates } from "../services/security.js";

async function chooseSiteDomain(profileName) {
  const NO_CUSTOM_DOMAIN = "No custom domain (use auto-generated URL)";
  const ENTER_CUSTOM_DOMAIN = "Enter a custom domain/subdomain";
  let domains = [NO_CUSTOM_DOMAIN];

  console.log("Choosing domain name for site:");
  try {
    const listDomainsResponse = await listDomains(profileName);
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

async function chooseSSLCertificate(profileName) {
  console.log("Choosing SSL certificate for secure HTTPS connections:");
  let certificates;
  try {
    certificates = await listCertificates(profileName);
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

/**
 * Gather all user input needed for deployment (domain and SSL certificate).
 * @param {string} profileName - AWS profile name
 * @returns {Promise<{siteDomain: string, sslCertificate: string}>}
 */
async function gatherUserInput(profileName) {
  const domain = await chooseSiteDomain(profileName);
  // Default Cloudfront certificate will be used if no custom domain is chosen
  const certificate = domain ? await chooseSSLCertificate(profileName) : null;
  return { siteDomain: domain, sslCertificate: certificate };
}

/**
 * Update pushkin.yaml with user input of site domain and SSL certificate.
 * @param {object} pushkinConfig - Pushkin configuration object
 * @param {string} projectName - Project name
 * @param {string} s3BucketName - S3 bucket name
 * @param {string} siteDomain - Domain name for the site
 * @param {string} sslCertificate - SSL certificate for the site
 * @returns {Promise<object>} Updated configuration
 */
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

  await savePushkinConfig(pushkinConfig);

  console.log(`Successfully updated pushkin.yaml with deployment information.`);
  return pushkinConfig;
}

export {
  verifyAwsProfile,
  loadPushkinConfig as loadDeploymentConfig,
  gatherUserInput,
  updateDeploymentConfig,
};
