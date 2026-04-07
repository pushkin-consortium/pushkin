/**
 * AWS Resources File Manager
 *
 * Utility module for reading and writing the awsResources.js file.
 * This file tracks AWS resource IDs (CloudFront, RDS, ECS, etc.) for the current Pushkin project.
 *
 * @module aws-resources
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

/**
 * Gets the path to awsResources.js in the current project
 * @returns {string} Absolute path to awsResources.js
 */
export function getAwsResourcesPath() {
  return path.join(process.cwd(), "awsResources.js");
}

/**
 * Reads awsResources.js file from the current project
 * @returns {object} Parsed awsResources object
 * @throws {Error} If file cannot be read
 */
export function readAwsResources() {
  try {
    const filePath = getAwsResourcesPath();
    return jsYaml.load(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(`Unable to read awsResources.js. That's strange.`);
    throw error;
  }
}

/**
 * Writes awsResources.js file to the current project
 * @param {object} awsResources - The awsResources object to write
 * @throws {Error} If file cannot be written
 */
export function writeAwsResources(awsResources) {
  try {
    const filePath = getAwsResourcesPath();
    fs.writeFileSync(filePath, jsYaml.dump(awsResources), "utf8");
  } catch (error) {
    console.error(`Can't write to awsResources.js. That's strange.`);
    throw error;
  }
}

/**
 * Updates a specific field in awsResources.js
 * @param {string} field - The field to update
 * @param {*} value - The value to set
 * @throws {Error} If file cannot be read or written
 */
export function updateAwsResourcesField(field, value) {
  const awsResources = readAwsResources();
  awsResources[field] = value;
  writeAwsResources(awsResources);
}

/**
 * Checks if awsResources.js exists in the current project
 * @returns {boolean} True if file exists
 */
export function awsResourcesExists() {
  return fs.existsSync(getAwsResourcesPath());
}
