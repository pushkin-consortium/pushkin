const { fs, path } = require("zx");
const ignore = require("ignore");
const { diffLines } = require("diff");

const basicDir = path.resolve(__dirname, "../../basic");
const nonBasicDir = path.resolve(__dirname, "..");

// Load .gitignore rules
const gitignorePath = path.resolve(__dirname, "../../../../.gitignore"); // repo root .gitignore
const gitignoreDir = path.dirname(gitignorePath);
const gitignoreRules = fs.readFileSync(gitignorePath, "utf8");
const ig = ignore().add(gitignoreRules);

/**
 * Recursively list all files in an experiment template directory
 * @param {string} dir - directory to list files from
 * @param {string} templateDir - root directory of the template
 * @param {string} gitignoreDir - directory containing the gitignore file (should be repo root)
 * @param {string[]} fileList - list of files to append to (for recursion; do not supply on initial call)
 * @returns {string[]} - list of files in the template directory
 */
const listFiles = (dir, templateDir, gitignoreDir, fileList = []) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(gitignoreDir, filePath);
    if (fs.statSync(filePath).isDirectory()) {
      listFiles(filePath, templateDir, gitignoreDir, fileList);
    } else if (!ig.ignores(relativePath)) {
      const templateFile = path.relative(templateDir, filePath);
      fileList.push(templateFile);
    }
  });
  return fileList;
};

/**
 * Compares the basic experiment template to a non-basic template
 * @param {string} basicDir - directory of the basic template
 * @param {string} nonBasicDir - directory of the non-basic template
 * @param {string} gitignoreDir - directory containing the gitignore file (should be repo root)
 * @param {string} subsetDir - (for development purposes) limit the template comparison to shared subdirectory
 * @returns {object} - object containing arrays of additions, modifications, and deletions
 */
const compareToBasic = (basicDir, nonBasicDir, gitignoreDir, subsetDir) => {
  const additions = [];
  const modifications = [];
  const deletions = [];
  const basicFiles = listFiles(basicDir, basicDir, gitignoreDir);
  const nonBasicFiles = listFiles(nonBasicDir, nonBasicDir, gitignoreDir);
  let allFiles;
  if (subsetDir) {
    // Throw an error if the subsetDir is not present in both the basic and non-basic templates
    if (!fs.existsSync(path.resolve(basicDir, subsetDir))) {
      throw new Error(`Subset directory ${subsetDir} not found in basic template`);
    } else if (!fs.existsSync(path.resolve(nonBasicDir, subsetDir))) {
      throw new Error(`Subset directory ${subsetDir} not found in non-basic template`);
    }
    const subsetFiles = [...basicFiles, ...nonBasicFiles].filter((file) =>
      file.startsWith(subsetDir),
    );
    allFiles = new Set(subsetFiles);
  } else {
    allFiles = new Set([...basicFiles, ...nonBasicFiles]);
  }
  allFiles.forEach((file) => {
    const basicFile = path.resolve(basicDir, file);
    const nonBasicFile = path.resolve(nonBasicDir, file);
    if (fs.existsSync(basicFile) && fs.existsSync(nonBasicFile)) {
      const basicContent = fs.readFileSync(basicFile, "utf8");
      const nonBasicContent = fs.readFileSync(nonBasicFile, "utf8");
      const diffs = diffLines(basicContent, nonBasicContent, { newlineIsToken: true });
      if (diffs.some((diff) => diff.added || diff.removed)) {
        modifications.push({ file, diffs });
      }
    } else if (fs.existsSync(nonBasicFile)) {
      additions.push(file);
    } else {
      deletions.push(file);
    }
  });
  return { additions, modifications, deletions };
};

module.exports = { basicDir, nonBasicDir, gitignoreDir, listFiles, compareToBasic };
