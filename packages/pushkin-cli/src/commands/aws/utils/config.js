/**
 * Config File Manager
 * Utility module for reading and writing the pushkin.yaml configuration file.
 * @module config
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

/**
 * Gets the path to pushkin.yaml in the current project (assume at root level)
 * @returns {string} Absolute path to pushkin.yaml
 */
export function getPushkinConfigPath() {
  return path.join(process.cwd(), "pushkin.yaml");
}

/**
 * Loads and parses pushkin.yaml
 * @returns {Promise<object>} Parsed pushkin.yaml configuration object
 * @throws {Error} If file cannot be read or parsed
 */
export async function loadPushkinConfig() {
  try {
    const filePath = getPushkinConfigPath();
    const fileContent = await fs.promises.readFile(filePath, "utf8");
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
 * @returns {Promise<void>} Promise that resolves when the file is written
 * @throws {Error} If file cannot be written
 */
export async function savePushkinConfig(config) {
  try {
    const filePath = getPushkinConfigPath();
    await fs.promises.writeFile(filePath, jsYaml.dump(config), "utf8");
  } catch (error) {
    throw new Error(`Failed to write pushkin.yaml: ${error.message}`);
  }
}

/**
 * Checks if pushkin.yaml exists in the current project
 * @returns {boolean} True if file exists
 */
export function pushkinConfigExists() {
  return fs.existsSync(getPushkinConfigPath());
}
