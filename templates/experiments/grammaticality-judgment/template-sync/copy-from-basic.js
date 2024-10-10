const fs = require("fs");
const path = require("path");
const { basicDir, nonBasicDir, gitignoreDir, listFiles } = require("./utils.js");
const { additions, modifications, deletions } = require("./template-diffs.js");

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
}

console.log(`Copying files from basic exp template to ${path.basename(nonBasicDir)} template...`);
copyFiles();
