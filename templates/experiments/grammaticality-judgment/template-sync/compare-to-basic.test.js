// Compares all template files to the basic template
// Tests will fail is the differences are not permitted in template-diffs.js

const { fs, path } = require("zx");
const ignore = require("ignore");
const { diffLines } = require("diff");
let { additions, modifications, deletions } = require("./template-diffs.js");

// For development purposes only, limit the comparison to a shared subdirectory
let subsetDir;
// Comment out the line below for final testing
//subsetDir = "src/web page/src";

// Subset additions, modifications, and deletions based on subsetDir (if provided)
if (subsetDir) {
  additions = additions.filter((file) => file.startsWith(subsetDir));
  modifications = modifications.filter((file) => file.startsWith(subsetDir));
  deletions = deletions.filter((file) => file.startsWith(subsetDir));
}

// Load .gitignore rules
const gitignorePath = path.resolve(__dirname, "../../../../.gitignore"); // repo root .gitignore
const gitignoreRules = fs.readFileSync(gitignorePath, "utf8");
const ig = ignore().add(gitignoreRules);

/**
 * Recursively list all files in an experiment template directory
 * @param {string} dir - directory to list files from
 * @param {string} templateDir - root directory of the template
 * @param {string} gitignoreDir - directory containing the gitignore file (should be repo root)
 * @param {string[]} fileList - list of files to append to
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
    allFiles = new Set(
      [...basicFiles, ...nonBasicFiles].filter((file) => file.startsWith(subsetDir)),
    );
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

const comparison = compareToBasic(
  path.resolve(__dirname, "../../basic"),
  path.resolve(__dirname, ".."),
  path.dirname(gitignorePath),
  subsetDir,
);

describe("grammaticality-judgment template", () => {
  test("should have all allowed additions", () => {
    const unexpectedMissing = additions.filter((file) => !comparison.additions.includes(file));
    expect(unexpectedMissing).toHaveLength(0);
  });
  test("should have no additions other than those allowed", () => {
    const unexpectedAdditions = comparison.additions.filter((file) => !additions.includes(file));
    expect(unexpectedAdditions).toHaveLength(0);
  });
  test("should have all allowed modifications", () => {
    const unexpectedDuplicates = [];
    // Loop over the files with expected modifications
    modifications.forEach((expectedMod) => {
      // Get the detected modifications for that particular file
      const fileMods = comparison.modifications.find(
        (detectedMod) => detectedMod.file === expectedMod.file,
      );
      // If the file was not detected as modified, add it to the unexpected duplicates
      if (!fileMods) {
        unexpectedDuplicates.push(expectedMod);
      } else {
        // If the expected modifications are specified, loop over them
        if (expectedMod.diffs) {
          const unexpectedNonDiffs = [];
          expectedMod.diffs.forEach((expectedDiff) => {
            // If the expected modification is not detected, add it to the unexpected non-diffs
            if (!fileMods.diffs.some((detectedDiff) => detectedDiff.value.includes(expectedDiff))) {
              unexpectedNonDiffs.push(expectedDiff);
            }
          });
          // If any unexpected non-diffs were found, add the file to the unexpected duplicates
          if (unexpectedNonDiffs.length > 0) {
            unexpectedDuplicates.push({
              file: expectedMod.file,
              diffs: unexpectedNonDiffs,
            });
          }
        } // If the expected modifications are not specified, allow any modifications
      }
    });
    expect(unexpectedDuplicates).toHaveLength(0);
  });
  test("should have no modifications other than those allowed", () => {
    const unexpectedModifications = [];
    // Loop over the files with detected modifications
    comparison.modifications.forEach((detectedMod) => {
      // Get the expected modifications for that particular file
      const fileMods = modifications.find((expectedMod) => expectedMod.file === detectedMod.file);
      // If the file was not expected to be modified, add it to the unexpected modifications
      if (!fileMods) {
        unexpectedModifications.push(detectedMod);
      } else {
        // If the expected modifications are specified, loop over the detected modifications
        if (fileMods.diffs) {
          const unexpectedDiffs = [];
          // Filter to just the added or removed lines before looping
          detectedMod.diffs
            .filter((detectedDiff) => detectedDiff.added || detectedDiff.removed)
            .forEach((detectedDiff) => {
              // If the detected modification is not allowed, add it to the unexpected diffs
              if (
                !fileMods.diffs.some((expectedDiff) => detectedDiff.value.includes(expectedDiff))
              ) {
                unexpectedDiffs.push(detectedDiff);
              }
            });
          // If any unexpected diffs were found, add the file to the unexpected modifications
          if (unexpectedDiffs.length > 0) {
            unexpectedModifications.push({
              file: detectedMod.file,
              diffs: unexpectedDiffs,
            });
          }
        } // If the expected modifications are not specified, allow any modifications
      }
    });
    expect(unexpectedModifications).toHaveLength(0);
  });
  test("should have all allowed deletions", () => {
    const unexpectedPresent = deletions.filter((file) => !comparison.deletions.includes(file));
    expect(unexpectedPresent).toHaveLength(0);
  });
  test("should have no deletions other than those allowed", () => {
    const unexpectedDeletions = comparison.deletions.filter((file) => !deletions.includes(file));
    expect(unexpectedDeletions).toHaveLength(0);
  });
});
