// Compares all template files to the basic template
// Tests will fail is the differences are not permitted in template-diffs.js

const { basicDir, nonBasicDir, gitignoreDir, compareToBasic } = require("./utils.js");
let { additions, modifications, deletions } = require("./template-diffs.js");

// For development purposes only, limit the comparison to a shared subdirectory
let subsetDir;
// Comment out the line below for final testing
//subsetDir = "src/web page/src";

// Subset additions, modifications, and deletions based on subsetDir (if provided)
if (subsetDir) {
  additions = additions.filter((file) => file.startsWith(subsetDir));
  modifications = modifications.filter((mod) => mod.file.startsWith(subsetDir));
  deletions = deletions.filter((file) => file.startsWith(subsetDir));
}

const comparison = compareToBasic(basicDir, nonBasicDir, gitignoreDir, subsetDir);

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
