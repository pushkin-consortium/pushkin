/**
 * AWS Configuration File Manager.
 * Utility module for generating, loading, and validating the aws-deploy.yaml configuration file.
 * @module aws/utils/aws-config
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { getProjectRoot } from "../../../utils/pushkin-config.js";

/**
 * Walks up the directory tree from process.cwd() to find aws-deploy.yaml.
 * @returns {string} Absolute path to aws-deploy.yaml
 * @throws {Error} If aws-deploy.yaml is not found in the current directory or any parent
 */
function getAwsConfigPath() {
  let currentDir = process.cwd();
  const rootDir = path.parse(currentDir).root;

  while (true) {
    const configPath = path.join(currentDir, "aws-deploy.yaml");
    if (fs.existsSync(configPath)) return configPath;
    if (currentDir === rootDir) break;
    currentDir = path.dirname(currentDir);
  }

  throw new Error(
    "No aws-deploy.yaml found. Run 'pushkin aws init' from your project root to create one.",
  );
}

/**
 * Copies the default aws-deploy.yaml template into the Pushkin project root.
 * Does nothing if the file already exists.
 * @param {string|null} configPath - Optional destination path; defaults to the directory containing pushkin.yaml
 */
function generateAwsConfig(configPath = null) {
  const filePath = configPath || path.join(getProjectRoot(), "aws-deploy.yaml");
  if (fs.existsSync(filePath)) return;
  fs.copyFileSync(path.join(__dirname, "..", "aws-deploy.yaml"), filePath);
  console.log(
    `Created aws-deploy.yaml at ${filePath} with default settings. Edit this file directly to customize your deployment if needed.`,
  );
}

/**
 * Loads and parses aws-deploy.yaml from the current project.
 * @returns {object} Parsed AWS configuration object
 * @throws {Error} If the file is not found, is not valid YAML, or is not an object
 */
function loadAwsConfig() {
  const configPath = getAwsConfigPath();
  try {
    const config = jsYaml.load(fs.readFileSync(configPath, "utf8"));
    if (config == null || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("aws-deploy.yaml is empty or not a valid YAML object");
    }
    return config;
  } catch (error) {
    if (error.name === "YAMLException") {
      throw new Error(`Invalid YAML in aws-deploy.yaml: ${error.message}`, { cause: error });
    }
    throw error;
  }
}

/**
 * Validates the AWS configuration object.
 * @param {object} config
 * @returns {string[]} Array of error messages, empty if valid
 */
function validateAwsConfig(config) {
  const errors = [];

  if (!/^(us|eu|ap|ca|sa|me|af|il|mx)-[a-z]+-\d+$/.test(config.region))
    errors.push(
      `Invalid region: ${config.region}. Expected format like us-east-1, eu-west-2, ap-southeast-1`,
    );

  if (config.autoscaling.minSize > config.autoscaling.maxSize)
    errors.push(
      `autoscaling.minSize (${config.autoscaling.minSize}) cannot be greater than maxSize (${config.autoscaling.maxSize})`,
    );

  if (
    config.autoscaling.desiredCapacity < config.autoscaling.minSize ||
    config.autoscaling.desiredCapacity > config.autoscaling.maxSize
  )
    errors.push(
      `autoscaling.desiredCapacity (${config.autoscaling.desiredCapacity}) must be between minSize and maxSize`,
    );

  for (const service of ["api", "worker", "rabbitmq"]) {
    if (config.ecs[service].memory <= 0) errors.push(`ecs.${service}.memory must be positive`);
  }

  const validPriceClasses = ["PriceClass_100", "PriceClass_200", "PriceClass_All"];
  if (!validPriceClasses.includes(config.cloudfront.priceClass))
    errors.push(
      `Invalid cloudfront.priceClass: ${config.cloudfront.priceClass}. Must be one of: ${validPriceClasses.join(", ")}`,
    );

  return errors;
}

export { getAwsConfigPath, generateAwsConfig, loadAwsConfig, validateAwsConfig };
