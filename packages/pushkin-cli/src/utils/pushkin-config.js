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
 * Gets the path to pushkin.yaml in the current project, walks up directory tree if not found in current dir
 * @returns {string} Absolute path to pushkin.yaml
 */
function getPushkinConfigPath() {
  // TODO: better checking to make sure this is indeed a pushkin project would be good
  let currentDir = process.cwd();
  const rootDir = path.parse(currentDir).root;

  while (true) {
    const configPath = path.join(currentDir, "pushkin.yaml");
    if (fileExists(configPath)) return configPath;

    if (currentDir === rootDir) break;
    currentDir = path.dirname(currentDir);
  }

  throw new Error("No pushkin project found here or in any parent directories");
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
    // TODO: add Pushkin YAML validation
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
export { getPushkinConfigPath, loadPushkinConfig, savePushkinConfig };
