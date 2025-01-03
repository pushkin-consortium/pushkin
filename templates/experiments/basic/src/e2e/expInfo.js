const fs = require("fs");
const jsYaml = require("js-yaml");
const path = require("path");

const expConfig = jsYaml.load(fs.readFileSync(path.resolve(__dirname, "../config.yaml")));
const expInfo = {
  longName: expConfig.experimentName,
  shortName: expConfig.shortName,
  archived: expConfig.archived,
  paused: expConfig.dataPaused,
  simulationMode: true, // Do all jsPsych plugins used have simulation mode?
  showResults: expConfig.showResults,
  resultsType: expConfig.resultsType,
  dataRows: 1,
};

module.exports = { expInfo };
