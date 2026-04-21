/**
 * Pushkin Config File Manager
 * Utility module for reading and writing the pushkin.yaml configuration file.
 * Assumes pushkin.yaml is located at the root of the project directory.
 * @module pushkin-config
 */

import path from "path";
import jsYaml from "js-yaml";
import { fileExists, readFile, writeFile } from "./file.js";

/**
 * Gets the path to pushkin.yaml in the current project (assume at root level)
 * @returns {string} Absolute path to pushkin.yaml
 */
function getPushkinConfigPath() {
  return path.join(process.cwd(), "pushkin.yaml");
}

/**
 * Checks if pushkin.yaml exists in the current project
 * @returns {boolean} True if file exists
 */
function pushkinConfigExists() {
  return fileExists(getPushkinConfigPath());
}

/**
 * Loads and parses pushkin.yaml
 * @returns {object} Parsed configuration object
 * @throws {Error} If file cannot be read or parsed
 */
function loadPushkinConfig() {
  try {
    const filePath = getPushkinConfigPath();
    const fileContent = readFile(filePath, "utf8");
    return jsYaml.load(fileContent);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`pushkin.yaml not found at ${getPushkinConfigPath()}`);
    }
    if (error.name === "YAMLException") {
      throw new Error(`Invalid YAML in pushkin.yaml: ${error.message}`);
    }
    throw new Error(`Failed to load pushkin.yaml: ${error.message}`);
  }
}

/**
 * Writes to pushkin.yaml
 * @param {object} config - The configuration object to write
 * @throws {Error} If file cannot be written
 */
function savePushkinConfig(config) {
  try {
    const filePath = getPushkinConfigPath();
    writeFile(filePath, jsYaml.dump(config), "utf8");
  } catch (error) {
    throw new Error(`Failed to write pushkin.yaml: ${error.message}`);
  }
}

// Export functions
export { getPushkinConfigPath, pushkinConfigExists, loadPushkinConfig, savePushkinConfig };
