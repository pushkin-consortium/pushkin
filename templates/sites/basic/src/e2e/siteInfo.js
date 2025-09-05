const fs = require("fs");
const jsYaml = require("js-yaml");
const path = require("path");

// Get the main config file
const pushkinConfig = jsYaml.load(fs.readFileSync(path.resolve(__dirname, "../pushkin.yaml")));

// Get the experiment names and other relevant info from exp e2e directories
const expsInfo = [];
const expFolders = fs.readdirSync(path.resolve(__dirname, "../experiments"));
expFolders.forEach((exp) => {
  // Push each exp's expInfo object into the expsInfo array
  const { expInfo } = require(path.resolve(__dirname, `../experiments/${exp}/e2e/expInfo`));
  expsInfo.push(expInfo);
});

module.exports = { pushkinConfig, expsInfo };
