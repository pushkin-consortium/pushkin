const moveToProjectRoot = () => {
  // better checking to make sure this is indeed a pushkin project would be good
  while (process.cwd() != path.parse(process.cwd()).root) {
    if (fs.existsSync(path.join(process.cwd(), "pushkin.yaml"))) return;
    process.chdir("..");
  }
  console.error("No pushkin project found here or in any above directories");
  process.exit();
};

const loadConfig = (configFile) => {
  // could add some validation to make sure everything expected in the config is there
  return new Promise((resolve, reject) => {
    try {
      resolve(jsYaml.load(fs.readFileSync(configFile, "utf8")));
    } catch (e) {
      console.error(`Pushkin config file missing, error: ${e}`);
      process.exit(1);
    }
  });
};