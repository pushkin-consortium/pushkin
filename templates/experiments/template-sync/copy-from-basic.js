const fs = require("fs");
const path = require("path");
const { listFiles } = require("./utils.js");
const { additions, modifications, deletions } = require("./template-diffs.js");

const basicDir = path.resolve(__dirname, "../basic");
const nonBasicDir = path.resolve(__dirname, "..", process.argv[2]);
if (!fs.existsSync(nonBasicDir) || !fs.lstatSync(nonBasicDir).isDirectory()) {
  console.error(`Directory ${nonBasicDir} does not exist`);
  process.exit(1);
} else if (path.basename(path.resolve(nonBasicDir, "..")) !== "experiments") {
  console.error(`Directory ${nonBasicDir} is not an experiment template directory`);
  process.exit(1);
} else if (path.basename(nonBasicDir) === "basic") {
  console.error("Target template cannot be basic");
  process.exit(1);
}
const gitignoreDir = path.resolve(__dirname, "../../.."); // Should be the repo root

/**
 * Get a list of duplicate files to copy from the basic template to the non-basic template
 * @returns {string[]} - list of files to copy
 */
const getFilesToCopy = () => {
  const basicFiles = listFiles(basicDir, basicDir, gitignoreDir);
  const diffFiles = [...additions, ...modifications.map((mod) => mod.file), ...deletions];
  const filesToCopy = basicFiles.filter((file) => !diffFiles.includes(file));
  return filesToCopy;
};

/**
 * Copy duplicate files from the basic template to the non-basic template
 * @returns {void}
 */
const copyFiles = () => {
  const filesToCopy = getFilesToCopy();
  filesToCopy.forEach((file) => {
    const basicFile = path.resolve(basicDir, file);
    const nonBasicFile = path.resolve(nonBasicDir, file);
    fs.copyFileSync(basicFile, nonBasicFile);
  });
};

console.log(`Copying files from basic exp template to ${path.basename(nonBasicDir)} template...`);
copyFiles();
