// Catalog of additional/modified/deleted files allowed in the template relative to the basic template

const additions = [
  // The following files are not present in the basic template
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
    // Specify exceptional diffs for specific templates
    exceptions: [
      {
        template: "lexical-decision",
        diffs: [], // Empty array means no diffs are allowed for the exceptional template file
      },
    ],
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
    ],
  },
  {
    file: "README.md",
    diffs: [`# @pushkin-templates/exp-`, `A Pushkin experiment template containing`],
  },
  {
    file: "src/config.yaml",
    diffs: [`showResults: `],
    exceptions: [
      {
        template: "grammaticality-judgment",
        diffs: [],
      },
      {
        template: "lexical-decision",
        diffs: [],
      },
    ],
  },
  {
    file: "src/e2e/expInfo.js",
    diffs: [
      `const stim = require("../web page/src/stim").default;`,
      `const expOptions = require("../web page/src/options").default;`, // First line of multi-line diff
      `dataRows: `,
    ],
    exceptions: [
      {
        template: "self-paced-reading",
        diffs: [
          `const stim = require("../web page/src/stim").default;`,
          `const expOptions = require("../web page/src/options").default;`,
          `dataRows: `,
          `simulationMode: `,
        ],
      },
    ],
  },
  {
    file: "src/e2e/experiment.test.js",
    diffs: [`test("should have the 'Hello, world!' stimulus", async () => {`],
  },
  {
    file: "src/e2e/results.test.js",
    diffs: [`const regex = /You`],
    exceptions: [
      {
        template: "lexical-decision",
        diffs: [],
      },
      {
        template: "self-paced-reading",
        diffs: [],
      },
    ],
  },
  {
    file: "src/web page/src/options.js",
    diffs: [`correctiveFeedback: true,`],
  },
  {
    file: "src/web page/package.json",
    // Allow jsPsych plugins/extensions to differ (will permit diffs beginning with "@jspsych-contrib" too)
    // Theoretically, this rule could allow other packages to be added/removed,
    // as long as they were alphabetized after jsPsych packages but before any shared packages
    // This seems unlikely though, so this simple rule should suffice
    diffs: [`"@jspsych`],
    exceptions: [
      {
        template: "lexical-decision",
        diffs: [],
      },
    ],
  },
  {
    file: "src/web page/src/results.js",
    diffs: [`<h2>You `],
    exceptions: [
      {
        template: "grammaticality-judgment",
        diffs: [
          `const percentileRank = `,
          `const summary_stat = `,
          `<h2>You `,
          `than {percentileRank}% of {totalRows} other people who completed this`,
        ],
      },
      {
        template: "self-paced-reading",
        diffs: [],
      },
    ],
  },
];

const deletions = [];

module.exports = { additions, modifications, deletions };
