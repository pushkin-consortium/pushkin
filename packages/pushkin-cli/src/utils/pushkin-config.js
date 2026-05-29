/**
 * Pushkin Config File Manager
 * Utility module for reading and writing the pushkin.yaml configuration file.
 * @module pushkin-config
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

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
    if (fs.existsSync(configPath)) return configPath;

    if (currentDir === rootDir) break;
    currentDir = path.dirname(currentDir);
  }

  throw new Error("No pushkin project found here or in any parent directories");
}

/**
 * Loads and parses pushkin.yaml.
 * @returns {object} Parsed configuration object
 * @throws {Error} If file cannot be read or parsed
 */
function loadPushkinConfig() {
  try {
    const filePath = getPushkinConfigPath();
    const fileContent = fs.readFileSync(filePath, "utf8");
    const config = jsYaml.load(fileContent);
    const projectRoot = path.dirname(filePath);
    for (const field of ["usersDir", "experimentsDir", "coreDir"]) {
      if (config[field] != null) {
        config[field] = path.resolve(projectRoot, config[field]);
      }
    }
    return config;
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
    const projectRoot = path.dirname(filePath);
    const configToWrite = { ...config };
    for (const field of ["usersDir", "experimentsDir", "coreDir"]) {
      if (configToWrite[field] != null && path.isAbsolute(configToWrite[field])) {
        configToWrite[field] = path.relative(projectRoot, configToWrite[field]);
      }
    }
    fs.writeFileSync(filePath, jsYaml.dump(configToWrite), "utf8");
  } catch (error) {
    throw new Error(`Failed to write pushkin.yaml: ${error.message}`);
  }
}

export { getPushkinConfigPath, loadPushkinConfig, savePushkinConfig };
