/**
 * Pushkin File Utility
 * Utility module for reading and writing files in Pushkin projects (synchronous).
 * @module file
 */

import fs from "graceful-fs";
import path from "path";

/**
 * Read and parse a JSON file
 * @param {string} filePath - Absolute path to the JSON file
 * @returns {object} - Parsed JSON object
 * @throws {Error} - If file doesn't exist or JSON is invalid
 */
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Write an object to a JSON file
 * @param {string} filePath - Absolute path to the JSON file
 * @param {object} data - Object to write as JSON
 * @param {number} indent - Number of spaces for indentation (default: 2)
 * @throws {Error} - If write fails
 */
function writeJSON(filePath, data, indent = 2) {
  try {
    const content = JSON.stringify(data, null, indent);
    fs.writeFileSync(filePath, content, "utf8");
  } catch (error) {
    throw new Error(`Failed to write JSON to ${filePath}: ${error.message}`);
  }
}

/**
 * Check if a file exists
 * @param {string} filePath - Absolute path to check
 * @returns {boolean} - True if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Check if a path is a directory
 * @param {string} dirPath - Absolute path to check
 * @returns {boolean} - True if path is a directory
 */
function isDirectory(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Recursively walk a directory and return all file paths
 * @param {string} dir - Directory to walk
 * @param {string} baseDir - Base directory for calculating relative paths (defaults to dir)
 * @returns {Array<{absolutePath: string, relativePath: string}>} - Array of file path objects
 * @throws {Error} - If directory doesn't exist or can't be read
 */
function walkDirectory(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }

  let files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const absolutePath = path.join(dir, item);
    const stat = fs.statSync(absolutePath);

    if (stat.isDirectory()) {
      // Recursively walk subdirectories
      files = files.concat(walkDirectory(absolutePath, baseDir));
    } else {
      // Add file with both absolute and relative paths
      files.push({
        absolutePath,
        relativePath: path.relative(baseDir, absolutePath),
      });
    }
  }

  return files;
}

/**
 * Read a file's contents
 * @param {string} filePath - Absolute path to the file
 * @param {string} encoding - File encoding (default: 'utf8', use null for binary)
 * @returns {string|Buffer} - File contents as string or Buffer
 * @throws {Error} - If file doesn't exist or can't be read
 */
function readFile(filePath, encoding = "utf8") {
  try {
    return fs.readFileSync(filePath, encoding);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

/**
 * Write contents to a file
 * @param {string} filePath - Absolute path to the file
 * @param {string|Buffer} content - Content to write
 * @param {string} encoding - File encoding (default: 'utf8')
 * @throws {Error} - If write fails
 */
function writeFile(filePath, content, encoding = "utf8") {
  try {
    fs.writeFileSync(filePath, content, encoding);
  } catch (error) {
    throw new Error(`Failed to write ${filePath}: ${error.message}`);
  }
}

/**
 * Get file stats
 * @param {string} filePath - Absolute path to the file
 * @returns {fs.Stats|null} - File stats or null if file doesn't exist
 */
function getFileStats(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

/**
 * Create a directory recursively (like mkdir -p)
 * @param {string} dirPath - Absolute path to the directory
 * @throws {Error} - If directory creation fails
 */
function createDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
  }
}

/**
 * Delete a file
 * @param {string} filePath - Absolute path to the file
 * @throws {Error} - If deletion fails
 */
function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`Failed to delete ${filePath}: ${error.message}`);
    }
  }
}

export {
  readJSON,
  writeJSON,
  fileExists,
  isDirectory,
  walkDirectory,
  readFile,
  writeFile,
  getFileStats,
  createDirectory,
  deleteFile,
}