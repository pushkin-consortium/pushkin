// Catalog of additional/modified/deleted files allowed in the template relative to the basic template

const additions = [
  // The following files are not present in the basic template
  "template-sync/compare-to-basic.test.js",
  "template-sync/copy-from-basic.js",
  "template-sync/template-diffs.js",
  "template-sync/utils.js",
  "src/web page/src/consent.js",
  "src/web page/src/debrief.js",
  "src/web page/src/stim.js",
];

const modifications = [
  // Accept any modifications to the following files
  {
    // Differences won't be predictable, since this is auto-generated
    file: "CHANGELOG.md",
    diffs: undefined,
  },
  {
    // Differences won't be predictable, since this is auto-generated
    file: "src/web page/yarn.lock",
    diffs: undefined,
  },
  {
    // Diffs will be annoying to capture, as the experiment should differ significantly from basic
    file: "src/web page/src/experiment.js",
    diffs: undefined,
  },
  {
    // Again, expecting significant differences from the basic template
    file: "src/web page/src/experiment.test.js",
    diffs: undefined,
  },
  // Specify allowed modifications to the following files
  {
    file: "package.json",
    // Only allow package.json to differ in name, description, and repository.directory fields
    diffs: [
      // diffs must be an array of substrings on modified lines
      // This could be the entire line if a line (or multiple lines) is added or removed,
      // or a shared substring in the basic and non-basic lines in the case of modifications
      `"name": "@pushkin-templates/exp-`, // e.g., this is a shared substring
      `"description": "A Pushkin experiment template`,
      `"directory": "templates/experiments/`,
      //`version:`, // Uncomment to allow version to differ
      `"copy-from-basic": "node template-sync/copy-from-basic.js",`,
    ],
  },
  {
    file: "README.md",
    diffs: [`# @pushkin-templates/exp-`, `A Pushkin experiment template containing`],
  },
  {
    file: "src/e2e/expInfo.js",
    diffs: [
      `const stim = require("../web page/src/stim").default;`,
      `const expOptions = require("../web page/src/options").default;`, // First line of multi-line diff
      `dataRows: `,
    ],
  },
  {
    file: "src/e2e/experiment.test.js",
    diffs: [`test("should have the 'Hello, world!' stimulus", async () => {`],
  },
  {
    file: "src/web page/package.json",
    // Allow jsPsych plugins/extensions to differ (will permit diffs beginning with "@jspsych-contrib" too)
    // Theoretically, this rule could allow other packages to be added/removed,
    // as long as they were alphabetized after jsPsych packages but before any shared packages
    // This seems unlikely though, so this simple rule should suffice
    diffs: [`"@jspsych`],
  },
  {
    file: "src/web page/src/options.js",
    diffs: [`correctiveFeedback: true,`],
  },
];

const deletions = [];

module.exports = { additions, modifications, deletions };
