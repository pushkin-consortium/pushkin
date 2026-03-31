/**
 * AWS configuration constants
 * Centralized location for AWS region and utility functions
 */

import util from "util";

/**
 * Default AWS region for all operations
 * TODO: Make this configurable via pushkin.yaml or environment variable
 */
export const AWS_REGION = "us-east-1";

/**
 * Promisified exec utility for running shell commands
 * @example
 * await exec('ls -la')
 */
export const exec = util.promisify(require("child_process").exec);
