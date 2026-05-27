/**
 * User Input Phase
 * Handles interactive prompts for domain selection and SSL certificate choice
 * @module aws/phases/user-input
 */

import inquirer from "inquirer";
import { Route53DomainsClient, ListDomainsCommand } from "@aws-sdk/client-route-53-domains";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION } from "../constants.js";
import { listCertificates } from "../services/security.js";

/**
 * Choose a domain for the site from Route53 registered domains
 * @param {string} profileName - The IAM profile name
 * @returns {Promise<string>} - A promise that resolves to the chosen domain
 */
async function chooseDomain(profileName) {
  console.log("Choosing domain name for site");

  let domains = ["default"];

  try {
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const route53DomainsClient = factory.createClient(Route53DomainsClient);
    const listDomainsResponse = await route53DomainsClient.send(new ListDomainsCommand({}));

    listDomainsResponse.Domains.forEach((d) => {
      domains.push(d.DomainName);
    });
  } catch (error) {
    console.error(`Unable to get list of registered domains:`, error);
    // Continue with just 'default' option
  }

  domains.push("Enter a custom domain/subdomain");

  console.log(`Choosing...`);
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "domain",
      choices: domains,
      default: 0,
      message: "Which domain would you like to use for your site?",
    },
  ]);

  if (answers.domain === "Enter a custom domain/subdomain") {
    const customDomain = await inquirer.prompt([
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
    return customDomain.customDomain;
  }

  return answers.domain;
}

/**
 * Gather all user input needed for deployment (domain and SSL certificate)
 * @param {string} profileName - AWS profile name
 * @returns {Promise<{domain: string, certificate: string}>}
 */
export async function gatherUserInput(profileName) {
  // Get SSL certificate (must come first or input gets buried)
  console.log("Setting up SSL for load-balancer");
  let certificates;
  try {
    certificates = await listCertificates(profileName);
  } catch (e) {
    console.error(`Unable to list certificates.`);
    throw e;
  }
  const { certificateChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "certificateChoice",
      choices: Object.keys(certificates),
      default: 0,
      message:
        "Which SSL certificate would you like to use for your site?" +
        " (Note: Only ISSUED certificates work for ALB)",
    },
  ]);
  const certificate = certificates[certificateChoice];

  console.log(`Looks good!`);

  // Get domain choice
  const domain = await chooseDomain(profileName);

  return { domain, certificate };
}
