/**
 * AWS configuration constants
 * Centralized location for AWS region and utility functions
 */

import util from "util";
import { loadAwsConfig } from "./utils/aws-config.js";

/**
 * Default AWS region for all operations
 * TODO: Make this configurable via pushkin.yaml or environment variable
 */
export const AWS_REGION = "us-east-1";

/**
 * Tag key used to identify all Pushkin-managed AWS resources.
 * Value comes from aws-deploy.yaml (tagging.projectTagKey), defaulting to "PUSHKIN".
 */
export const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * Promisified exec utility for running shell commands
 * @example
 * await exec('ls -la')
 */
export const exec = util.promisify(require("child_process").exec);
