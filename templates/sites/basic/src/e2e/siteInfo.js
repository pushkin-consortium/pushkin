const fs = require("fs");
const jsYaml = require("js-yaml");

// Get the main config file
const pushkinConfig = jsYaml.load(fs.readFileSync("pushkin.yaml", "utf8"));

// Get the experiment names and other relevant info from exp config files
const expInfo = [];
const expFolders = fs.readdirSync("./experiments");
expFolders.forEach((exp) => {
  const expConfig = jsYaml.load(fs.readFileSync(`./experiments/${exp}/config.yaml`));
  expInfo.push({
    longName: expConfig.experimentName,
    shortName: expConfig.shortName,
    archived: expConfig.archived,
    paused: expConfig.dataPaused,
  });
});

module.exports = { pushkinConfig, expInfo };
