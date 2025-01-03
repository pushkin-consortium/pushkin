import path from "path";
//import { promises as fs } from 'fs';
import fs from "graceful-fs";
import jsYaml from "js-yaml";
import util from "util";
import { execSync } from 'child_process'; // eslint-disable-line
const exec = util.promisify(require("child_process").exec);
import pacMan from "../../pMan.js"; //which package manager is available?
import { env } from "process";

/**
 * Make sure changed passwords in the main config file propogate to the necessary locations
 * @returns {Promise} A promise that resolves when passwords have been updated in docker-compose.dev.yml and each experiment's config.yaml
 */
export const updatePasswords = async () => {
  const pushkinYamlPromise = fs.promises.readFile("pushkin.yaml").catch((e) => {
    console.error("Unable to read pushkin.yaml", e);
  });
  const composeFilePromise = fs.promises.readFile("pushkin/docker-compose.dev.yml").catch((e) => {
    console.error("Unable to read pushkin/docker-compose.dev.yml", e);
  });
  const expConfigPromises = [];
  const expDirs = fs.promises.readdir("experiments").catch((e) => {
    console.error("Unable to read experiments directory", e);
  });
  const exps = await expDirs;
  exps.forEach((exp) => {
    expConfigPromises.push(
      fs.promises.readFile(path.join("experiments", exp, "config.yaml")).catch((e) => {
        console.error(`Unable to read config.yaml in ${exp}`, e);
      }),
    );
  });
  const [pushkinYaml, composeFile, ...expConfigs] = await Promise.all([
    pushkinYamlPromise,
    composeFilePromise,
    ...expConfigPromises,
  ]);
  const testDBPass = jsYaml.load(pushkinYaml).databases.localtestdb.pass;
  const transactionDBPass = jsYaml.load(pushkinYaml).databases.localtransactiondb.pass;
  const composeFileData = jsYaml.load(composeFile);
  // Overwrite passwords in docker-compose file
  composeFileData.services.test_db.environment.POSTGRES_PASSWORD = testDBPass;
  composeFileData.services.test_transaction_db.environment.POSTGRES_PASSWORD = transactionDBPass;
  exps.forEach((exp) => {
    const workerName = exp.toLowerCase().concat("_worker");
    composeFileData.services[workerName].environment.DB_PASS = testDBPass;
    composeFileData.services[workerName].environment.TRANS_PASS = transactionDBPass;
  });
  const newComposeFile = fs.promises.writeFile(
    "pushkin/docker-compose.dev.yml",
    jsYaml.dump(composeFileData),
  );
  // Overwrite passwords in exp config files
  const newExpConfigs = [];
  expConfigs.forEach((config, index) => {
    const configData = jsYaml.load(config);
    configData.worker.service.environment.DB_PASS = testDBPass;
    const configLocation = path.join("experiments", exps[index], "config.yaml");
    newExpConfigs.push(fs.promises.writeFile(configLocation, jsYaml.dump(configData)));
  });
  return Promise.all([newComposeFile, ...newExpConfigs]);
};

// give package unique name, package it, npm install on installDir, return module name
const publishLocalPackage = async (modDir, modName, verbose) => {
  if (verbose) console.log("--verbose flag set inside publishLocalPackage()");
  return new Promise((resolve, reject) => {
    const packageJsonPath = path.join(modDir, "package.json");
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch (e) {
      reject(new Error("Failed to parse package.json".concat(e)));
    }
    let buildCmd;
    if (packageJson.dependencies["build-if-changed"] == null) {
      if (verbose)
        console.log(
          modName,
          "does not have build-if-changed installed. Recommend installation for faster runs of prep.",
        );
      buildCmd = pacMan.concat(" --mutex network run build");
    } else {
      if (verbose) console.log("Using build-if-changed for", modName);
      const pacRunner = pacMan == "yarn" ? "yarn" : "npx";
      buildCmd = pacRunner.concat(" build-if-changed");
    }
    // Check whether the package is a web page component
    if (modName.endsWith("_web")) {
      // Look for the experiment.js file
      const expJsPath = path.join(modDir, "src/experiment.js");
      if (fs.existsSync(expJsPath)) {
        // Get all the jsPsych plugins/extensions/timelines imported into experiment.js
        if (verbose) console.log(`Checking jsPsych packages in ${modName}`);
        const expJs = fs.readFileSync(expJsPath, { encoding: "utf8" }); // Specify encoding so string methods work
        // Find everything that starts with "@jspsych" up to a single or double quote
        // This should capture all jsPsych packages imported into the experiment
        const plugins = expJs.match(/@jspsych.*?(?=['"])/g);
        // Create lists of plugins to add and upgrade
        let pluginsToAdd = [];
        let pluginsToUpgrade = [];
        plugins.forEach((plugin) => {
          // Create a regex to find the version number specified after the import statement
          let versionMatch = new RegExp(`(?<=${plugin}'; \/\/ version:).+?(?= \/\/)`, "g");
          let pluginVersion = "";
          if (expJs.includes(`${plugin}'; // version:`)) {
            pluginVersion = expJs.match(versionMatch)[0];
          }
          // If any jsPsych plugins are not yet added to package.json, add them
          if (!packageJson.dependencies[plugin]) {
            if (pluginVersion === "") {
              // Just add the plugin name if no version/tag is specified
              pluginsToAdd.push(plugin);
            } else {
              // Append the version/tag if specified
              pluginsToAdd.push(plugin + "@" + pluginVersion);
            }
          } else {
            // package is already added to package.json
            // Check if version/tag is specified and differs from the one in package.json
            if (pluginVersion !== "" && packageJson.dependencies[plugin] !== pluginVersion) {
              pluginsToUpgrade.push(plugin + "@" + pluginVersion);
            }
          }
        });
        // If any plugins need to be added or upgraded, do so
        if (pluginsToAdd.length > 0) {
          if (verbose)
            console.log(`Adding jsPsych plugins to ${modName}:\n\t${pluginsToAdd.join("\n\t")}`);
          try {
            let addCmd = pacMan.concat(" --mutex network add ").concat(pluginsToAdd.join(" "));
            execSync(addCmd, { cwd: modDir }); // Probably needs to be sync so it finishes before install
          } catch (e) {
            console.error(`Problem adding jsPsych plugins to ${modName}`);
            throw e;
          }
        }
        if (pluginsToUpgrade.length > 0) {
          if (verbose)
            console.log(
              `Upgrading jsPsych plugins in ${modName}:\n\t${pluginsToUpgrade.join("\n\t")}`,
            );
          try {
            let upgradeCmd = pacMan
              .concat(" --mutex network upgrade ")
              .concat(pluginsToUpgrade.join(" "));
            execSync(upgradeCmd, { cwd: modDir }); // Probably needs to be sync so it finishes before install
          } catch (e) {
            console.error(`Problem upgrading jsPsych plugins in ${modName}`);
            throw e;
          }
        }
      } else {
        if (verbose) console.log(`No experiment.js found in ${modName}`);
      }
      if (verbose) console.log(`Finished checking jsPsych packages in ${modName}`);
    }
    if (verbose) console.log(`Installing dependencies for ${modDir}`);
    exec(pacMan.concat(" --mutex network install"), { cwd: modDir }).then(() => {
      if (verbose) console.log(`Building ${modName} from ${modDir}`);
      exec(buildCmd, { cwd: modDir }).then(() => {
        if (verbose) console.log(`${modName} is built`);
        exec("yalc publish --push", { cwd: modDir }).then(() => {
          if (verbose) console.log(`${modName} is published locally via yalc`);
          resolve(modName);
        });
      });
    });
  });
};

/**
 * Creates/updates .env.js in the Pushkin site's pushkin/front-end/src directory
 * @param {boolean} debug Whether the site is being prepped for testing (true) or deployment (false)
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 */
export function setEnv(debug, verbose) {
  if (verbose) {
    console.log("--verbose flag set inside setEnv()");
    console.log("Updating pushkin/front-end/src/.env.js");
  }
  try {
    let envJS = `const debug = ${debug};
      // The following will be undefined in the local environment
      // but are needed to route the API and server correctly for GitHub Codespaces
      const codespaces = ${process.env.CODESPACES};
      const codespaceName = '${process.env.CODESPACE_NAME}';
      module.exports = { debug, codespaces, codespaceName };`;
    envJS = envJS
      .split("\n")
      .map((line) => line.trim())
      .join("\n"); // Remove indentation
    fs.writeFileSync(path.join(process.cwd(), "pushkin/front-end/src", ".env.js"), envJS, "utf8");
  } catch (e) {
    console.error(`Unable to create .env.js`);
  }
  if (verbose) console.log(`Successfully set front-end environment variable debug=${debug}`);
}

export function updatePushkinJs(verbose) {
  if (verbose) {
    console.log("--verbose flag set inside updatePushkinJs()");
    console.log(`Writing out front-end config`);
  }
  try {
    const tempConfig = jsYaml.load(fs.readFileSync(path.join(process.cwd(), "pushkin.yaml")));
    let useConfig = {};
    useConfig.info = tempConfig.info;
    useConfig.apiEndpoint = tempConfig.apiEndpoint;
    useConfig.salt = tempConfig.salt;
    useConfig.fc = tempConfig.fc;
    useConfig.addons = tempConfig.addons;
    fs.writeFileSync(
      path.join(process.cwd(), "pushkin/front-end/src", ".pushkin.js"),
      `export const pushkinConfig = ${JSON.stringify(useConfig)}`,
    );
  } catch (e) {
    console.error(`Unable to create .pushkin.js`);
    throw e;
  }
}

// prepare a single experiment's api controllers
const prepApi = async (expDir, controller, verbose) => {
  return new Promise((resolve, reject) => {
    if (verbose) console.log("--verbose flag set inside prepApi()");
    const fullContrLoc = path.join(expDir, controller.location);
    if (verbose) console.log(`Started loading API controller for ${controller.mountPath}`);
    let moduleName;
    try {
      publishLocalPackage(fullContrLoc, controller.mountPath.concat("_api"), verbose);
    } catch (e) {
      console.error(`Problem publishing api for`.concat(controller.mountPath));
      throw e;
    }
    resolve(moduleName);
  });
};

// copy a directory
const copyRecursiveAsync = async (source, destination) => {
  const entries = await fs.promises.readdir(source, { withFileTypes: true });

  // Ensure the destination directory exists
  await fs.promises.mkdir(destination, { recursive: true });

  for (let entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursive call for directories
      await copyRecursiveAsync(srcPath, destPath);
    } else {
      // Copy file
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
};

// prepare a single experiment's web page
const prepWeb = async (expDir, expConfig, coreDir, verbose) => {
  if (verbose) console.log("--verbose flag set inside prepWeb()");
  const webPageLoc = path.join(expDir, expConfig.webPage.location);
  if (verbose) console.log(`Started loading web page for ${expConfig.shortName}`);
  let moduleName;
  try {
    moduleName = await publishLocalPackage(webPageLoc, expConfig.shortName.concat("_web"), verbose);
  } catch (err) {
    console.error(`Failed on publishing web page: ${err}`);
    throw err;
  }

  if (verbose) console.log(`Loaded web page for ${expConfig.experimentName} (${moduleName})`);
  const modListAppendix = {
    fullName: String(expConfig.experimentName),
    shortName: String(expConfig.shortName),
    module: String(moduleName),
    results: expConfig.showResults ? String(moduleName) + "_results" : null,
    logo: String(expConfig.logo),
    tagline: String(expConfig.tagline),
    duration: String(expConfig.duration),
    text: String(expConfig.text),
  };

  // move logo to assets folder
  fs.promises
    .copyFile(
      path.join(webPageLoc, "src/assets", expConfig.logo),
      path.join(coreDir, "front-end/src/assets/images/quiz/", expConfig.logo),
    )
    .catch((e) => {
      console.error(`Problem copying logo file for `, expConfig.shortName);
      throw e;
    });

  // Check for the timeline directory and copy its contents if it exists
  const timelineDir = path.join(webPageLoc, "src/assets", "timeline");
  try {
    const timelineExists = await fs.promises
      .access(timelineDir, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);

    if (timelineExists) {
      // Create the 'experiment' directory if it doesn't exist
      const experimentDir = path.join(coreDir, "front-end/public/experiments");
      await fs.promises.mkdir(experimentDir, { recursive: true });

      // Set the destination directory within the 'experiment' folder
      const publicDestDir = path.join(experimentDir, expConfig.shortName);
      await copyRecursiveAsync(timelineDir, publicDestDir);
      if (verbose)
        console.log(`Timeline assets for ${expConfig.experimentName} copied to ${publicDestDir}`);
    } else {
      if (verbose)
        console.log(
          `No timeline directory found for ${expConfig.experimentName}, nothing was copied.`,
        );
    }
  } catch (err) {
    console.error(
      `An error occurred while copying the timeline assets for ${expConfig.experimentName}: ${err}`,
    );
    throw err;
  }

  if (verbose) console.log(`Added ${expConfig.experimentName} to experiments.js`);
  return { moduleName, listAppendix: modListAppendix };
};

export const readConfig = (expDir) => {
  const expConfigPath = path.join(expDir, "config.yaml");
  try {
    return jsYaml.load(fs.readFileSync(path.join(expDir, "config.yaml")));
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error("File not found!");
    }
    throw err;
  }
};

// the main prep function for prepping all experiments
export const prep = async (experimentsDir, coreDir, verbose) => {
  if (verbose) {
    console.log("--verbose flag set inside prep()");
    console.log("package manager: ", pacMan);
  }

  const cleanWeb = async (coreDir, verbose) => {
    if (verbose) {
      console.log("--verbose flag set inside cleanWeb()");
      console.log(`resetting experiments.js`);
    }
    try {
      if (fs.existsSync(path.join(coreDir, "front-end/experiments.js"))) {
        //These extra experiments.js files are created when doing a local test deploy
        //If it doesn't exist, that's just fine
        fs.unlinkSync(path.join(coreDir, "front-end/experiments.js"));
        if (verbose) console.log("Cleaned up front-end/experiments.js");
      }
    } catch (e) {
      console.error(e);
    }
    const webPageAttachListFile = path.join(coreDir, "front-end/src/experiments.js");
    let cleanedWeb;
    try {
      cleanedWeb = fs.promises.writeFile(
        path.join(coreDir, "front-end/src/experiments.js"),
        `[]`,
        "utf8",
      );
    } catch (e) {
      console.error("Problem overwriting experiments.js");
      throw e;
    }
    return cleanedWeb;
  };

  let cleanedWeb;
  try {
    cleanedWeb = cleanWeb(coreDir, verbose);
  } catch (e) {
    throw e;
  }

  const expDirs = fs.readdirSync(experimentsDir);

  // Filter out any experiments where the config.yaml file has `archived` set to true
  const archivedDirs = [];
  expDirs.forEach((dir) => {
    try {
      const configPath = path.join(experimentsDir, dir, "config.yaml");
      const config = jsYaml.load(fs.readFileSync(configPath));
      if (config.archived) {
        archivedDirs.push(dir);
      }
    } catch (error) {
      console.error(`Failed to read config.yaml for ${dir}: ${error}`);
      throw error;
    }
  });
  const frontEndDirs = expDirs.filter((dir) => !archivedDirs.includes(dir));

  const prepAPIWrapper = (exp, verbose) => {
    if (verbose) {
      console.log("--verbose flag set inside prepAPIWrapper()");
      console.log(`Started prepping API for`, exp);
    }
    return new Promise((resolve, reject) => {
      const expDir = path.join(experimentsDir, exp);
      if (!fs.lstatSync(expDir).isDirectory()) resolve("");
      let expConfig;
      try {
        expConfig = readConfig(expDir);
      } catch (err) {
        console.error(err);
        reject(new Error(`Failed to read experiment config file for `.concat(exp).concat(err)));
      }
      let preppedApi;
      try {
        preppedApi = prepApi(expDir, expConfig.apiControllers, verbose);
      } catch (err) {
        console.error("Something wrong with prepping API", err);
        reject(new Error(`Unable to prep api for `.concat(exp)));
      }
      resolve(preppedApi);
    });
  };

  let preppedAPI;
  try {
    preppedAPI = Promise.all(expDirs.map((exp) => prepAPIWrapper(exp, verbose)));
  } catch (err) {
    console.error(err);
    process.exit();
  }

  const installAndBuild = async (where, verbose) => {
    if (verbose) console.log("--verbose flag set inside installAndBuild()");
    let returnVal;
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(path.join(where, "package.json"), "utf8"));
    } catch (e) {
      console.error("Failed to parse package.json");
      throw e;
    }
    try {
      if (packageJson.dependencies["build-if-changed"] == null) {
        if (verbose)
          console.log(
            where,
            " does not have build-if-changed installed. Recommend installation for faster runs of prep.",
          );
        execSync(pacMan.concat(" --mutex network run build"), { cwd: where });
      } else {
        if (verbose) console.log("Using build-if-changed for", where);
        const pacRunner = pacMan == "yarn" ? "yarn" : "npx";
        returnVal = exec(pacRunner.concat(" build-if-changed"), { cwd: where }).toString();
        if (verbose) console.log(returnVal);
        if (returnVal.search("No changes") > 0) {
          if (verbose) console.log("No changes. Building not necessary.");
        } else {
          if (verbose) console.log("rebuilt ", where);
        }
      }
    } catch (err) {
      throw err;
    }
    return returnVal;
  };

  const prepWebWrapper = (exp, verbose) => {
    if (verbose) {
      console.log("--verbose flag set inside prepWebWrapper()");
      console.log(`Started prepping web page for`, exp);
    }
    return new Promise((resolve, reject) => {
      const expDir = path.join(experimentsDir, exp);
      if (!fs.lstatSync(expDir).isDirectory()) resolve("");
      let expConfig;
      try {
        expConfig = readConfig(expDir);
      } catch (err) {
        console.error(err);
        reject(new Error(`Failed to read experiment config file for `.concat(exp).concat(err)));
      }
      let webPageIncludes;
      try {
        webPageIncludes = prepWeb(expDir, expConfig, coreDir, verbose);
      } catch (err) {
        reject(new Error(`Unable to prep web page for `.concat(exp)));
      }
      resolve(webPageIncludes);
    });
  };

  let webPageIncludes;
  try {
    // Mapping over frontEndDirs (not expDirs) because we want to keep archived experiments off the front end
    webPageIncludes = Promise.all(frontEndDirs.map((exp) => prepWebWrapper(exp, verbose)));
  } catch (err) {
    console.error(err);
    process.exit();
  }

  const prepWorkerWrapper = async (exp, verbose) => {
    if (verbose) {
      console.log("--verbose flag set inside prepWorkerWrapper()");
      console.log(`Building worker for`, exp);
    }
    const expDir = path.join(experimentsDir, exp);
    if (!fs.lstatSync(expDir).isDirectory()) resolve("");
    let expConfig;
    try {
      expConfig = readConfig(expDir);
    } catch (err) {
      console.error(`Failed to read experiment config file for `.concat(exp));
      throw err;
    }
    const workerConfig = expConfig.worker;
    const workerName = `${exp}_worker`.toLowerCase(); //Docker names must all be lower case
    const workerLoc = path.join(expDir, workerConfig.location).replace(/ /g, "\\ "); //handle spaces in path

    let AMQP_ADDRESS;
    // Recall, compFile is docker-compose.dev.yml, and is defined outside this function.
    try {
      AMQP_ADDRESS = compFile.services[workerName].environment["AMQP_ADDRESS"].split("=")[1];
    } catch (e) {
      console.error(`Problem finding AMQP address for ${workerName}`);
      console.error(
        `Value of service ${workerName} in docker-compose.dev.yml:\n ${JSON.stringify(compFile.services[workerName])}`,
      );
      throw e;
    }

    compFile.services[workerName].environment = {};
    compFile.services[workerName].environment.AMQP_ADDRESS =
      AMQP_ADDRESS || "amqp://message-queue:5672";
    compFile.services[workerName].environment.DB_USER = pushkinYAML.databases.localtestdb.user;
    compFile.services[workerName].environment.DB_PASS = pushkinYAML.databases.localtestdb.pass;
    compFile.services[workerName].environment.DB_HOST = pushkinYAML.databases.localtestdb.host;
    compFile.services[workerName].environment.DB_DB = pushkinYAML.databases.localtestdb.name;
    compFile.services[workerName].environment.TRANS_USER =
      pushkinYAML.databases.localtransactiondb.user;
    compFile.services[workerName].environment.TRANS_PASS =
      pushkinYAML.databases.localtransactiondb.pass;
    compFile.services[workerName].environment.TRANS_HOST =
      pushkinYAML.databases.localtransactiondb.host;
    compFile.services[workerName].environment.TRANS_DB =
      pushkinYAML.databases.localtransactiondb.name;
    compFile.services[workerName].environment.TRANS_PORT =
      pushkinYAML.databases.localtransactiondb.port;

    let workerBuild;
    try {
      if (verbose) console.log(`Building docker image for ${workerName}`);
      let dockerCommand = `docker build ${workerLoc} -t ${workerName} --load`;
      if (verbose) console.log(dockerCommand);
      workerBuild = exec(dockerCommand);
    } catch (e) {
      console.error(`Problem building worker for ${exp}`);
      throw e;
    }
    return workerBuild;
  };

  const composeFileLoc = path.join(path.join(process.cwd(), "pushkin"), "docker-compose.dev.yml");
  const pushkinYAMLFileLoc = path.join(process.cwd(), "pushkin.yaml");
  let compFile;
  let pushkinYAML;
  try {
    compFile = jsYaml.load(fs.readFileSync(composeFileLoc), "utf8");
    pushkinYAML = jsYaml.load(fs.readFileSync(pushkinYAMLFileLoc), "utf8");
    if (verbose) console.log("loaded docker-compose.dev.yml and pushkin.yaml.");
  } catch (e) {
    console.error("Failed to load either pushkin.yaml or docker-compose.dev.yml or both.");
    throw e;
  }

  let preppedWorkers;
  try {
    preppedWorkers = Promise.all(expDirs.map((exp) => prepWorkerWrapper(exp, verbose)));
  } catch (err) {
    console.error(err);
    throw err;
  }

  const tempAwait = await Promise.all([webPageIncludes, cleanedWeb, preppedAPI]);

  // Deal with Web page includes
  let finalWebPages = tempAwait[0];
  let top;
  let bottom;
  let toWrite;
  try {
    if (verbose) console.log("Writing out experiments.js");
    top = finalWebPages.map((include) => {
      let importStatement = `import ${include.moduleName} from '${include.moduleName}';\n`;
      if (include.listAppendix.results) {
        importStatement += `import { ExpResults as ${include.listAppendix.results} } from '${include.moduleName}';\n`;
      }
      return importStatement;
    });
    top = top.join("");

    /**
     * Replacer function so module names are not quoted
     * @param {string} key - The key of the object being stringified
     * @param {string} value - The value of the object being stringified
     * @returns {string} - The stringified value
     */
    const replacer = (key, value) => {
      if (key === "module" || key === "results") {
        return `__RAW__${value}__RAW__`; // Mark the value to remove quotes
      }
      return value;
    };

    bottom = finalWebPages
      .map((include) => {
        return JSON.stringify(include.listAppendix, replacer, 2);
      })
      .join(",\n");
    toWrite = `${top}export default [\n${bottom}];`;

    // Post-process the JSON string to remove quotes from marked values
    toWrite = toWrite.replace(/"__RAW__(.*?)__RAW__"/g, "$1");

    fs.writeFileSync(path.join(coreDir, "front-end/src/experiments.js"), toWrite, "utf8");
  } catch (e) {
    console.error("Failed to include web pages in front end");
    throw e;
  }

  //Finally, install pushkin/api and pushkin/front-end
  //Note that this cannot run until the individual apis and webpages for all experiments have been rebuilt
  //Nothing depends on the workers, though, so we can defer that await until later
  let installedApi;
  try {
    if (verbose) console.log("Installing combined API");
    installedApi = exec(pacMan.concat(" install"), { cwd: path.join(coreDir, "api") }).then(() => {
      if (verbose) console.log("Installed combined API");
    });
  } catch (err) {
    console.error("Problem installing and buiding combined API");
    throw err;
  }
  let installedWeb;
  try {
    if (verbose) console.log("Installing combined front-end");
    installedWeb = exec(pacMan.concat(" install"), { cwd: path.join(coreDir, "front-end") }).then(
      () => {
        if (verbose) console.log("Installed combined front-end");
      },
    );
  } catch (err) {
    console.error("Problem installing and buiding combined front-end");
    throw err;
  }

  await preppedWorkers;
  if (verbose) console.log("Finished building all experiment workers");
  try {
    if (verbose) console.log(`updating docker-compose.dev.yml`);
    fs.writeFileSync(composeFileLoc, jsYaml.dump(compFile), "utf8");
  } catch (e) {
    console.error("Failed to create new compose file", e);
    process.exit();
  }

  try {
    updatePushkinJs(verbose); //This is synchronous
  } catch (e) {
    throw e;
  }

  await Promise.all([installedApi, installedWeb]);
  try {
    fs.copyFileSync("pushkin/front-end/src/experiments.js", "pushkin/front-end/experiments.js");
  } catch (e) {
    console.error("Couldn't copy experiments.js. Make sure it exists and is in the right place.");
    process.exit();
  }

  if (verbose) console.log("Building API");
  let builtAPI;
  try {
    builtAPI = exec(`docker build -t api:latest pushkin/api`, { cwd: process.cwd() });
  } catch (e) {
    console.error(`Problem building API`);
    throw e;
  }
  if (verbose) console.log("Building server");
  let builtServer;
  try {
    builtServer = exec(`docker build -t server:latest pushkin/front-end`, { cwd: process.cwd() });
  } catch (e) {
    console.error(`Problem building server`);
    throw e;
  }

  return Promise.all([builtAPI, builtServer]);
};
