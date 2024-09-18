#!/usr/bin/env node

import { execSync, exec } from "child_process";
/* eslint-disable-next-line no-unused-vars */
import commandLineArgs from "command-line-args"; // commandLineArgs is necessary for the CLI to run
//import { Command } from "commander";
import * as commander from "commander";
import "core-js/stable";
import * as compose from "docker-compose";
import got from "got";
import fs from "graceful-fs";
import inquirer from "inquirer";
import jsYaml from "js-yaml";
import path from "path";
import "regenerator-runtime/runtime";
import shelljs from "shelljs";

// Subcommands
import {
  awsInit,
  nameProject,
  addIAM,
  awsArmageddon,
  awsList,
  createAutoScale,
} from "./commands/aws/index.js";
import {
  deleteExperiment,
  getJsPsychImports,
  getJsPsychPlugins,
  getJsPsychTimeline,
  removeExpWorkers,
  setupPushkinExp,
  updateExpConfig,
} from "./commands/experiments/index.js";
import { prep, setEnv } from "./commands/prep/index.js";
import { setupdb, setupTestTransactionsDB } from "./commands/setupdb/index.js";
import { initSite, setupPushkinSite } from "./commands/sites/index.js";

import pacMan from "./pMan.js"; //which package manager is available?

// Commander.js setup
const program = new commander.Command();
const version = require("../package.json").version;
program.version(version);

const moveToProjectRoot = () => {
  // better checking to make sure this is indeed a pushkin project would be goodf
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
      resolve(jsYaml.safeLoad(fs.readFileSync(configFile, "utf8")));
    } catch (e) {
      console.error(`Pushkin config file missing, error: ${e}`);
      process.exit(1);
    }
  });
};

const updateS3 = async () => {
  let awsName, useIAM;
  try {
    let awsResources = jsYaml.safeLoad(
      fs.readFileSync(path.join(process.cwd(), "awsResources.js"), "utf8"),
    );
    awsName = awsResources.awsName;
    useIAM = awsResources.iam;
  } catch (e) {
    console.error(`Unable to read deployment config`);
    throw e;
  }

  let syncMe;
  try {
    return syncS3(awsName, useIAM);
  } catch (e) {
    console.error(`Unable to sync local build with s3 bucket`);
    throw e;
  }
};

const dockerLogin = async () => {
  //get dockerhub id
  let DHID;
  try {
    let config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
    DHID = config.DockerHubID;
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`);
    throw e;
  }

  if (DHID == "") {
    throw new Error(`Your DockerHub ID has disappeared from pushkin.yaml.\n I am not sure how that happened.\n
      If you run '$ pushkin setDockerHub' and then retry aws update, it might work. Depending on exactly why your DockerHub ID wasn't in pushkin.yaml.`);
  }

  try {
    console.log(`Confirming docker login.`);
    execSync(`cat .docker | docker login --username ${DHID} --password-stdin`);
  } catch (e) {
    console.error(`Automatic login to DockerHub failed. This might be because your ID or password are wrong.\n
      Try running '$ pushkin setDockerHub' and reset then try again.\n
      If that still fails, report an issue to Pushkin on GitHub. In the meantime, you can probably login manually\n
      by typing '$ docker login' into the console.\n Provide your username and password when asked.\n
      Then try '$ pushkin aws update' again.`);
    process.exit();
  }

  return DHID;
};

const updateDocker = async () => {
  let DHID = await dockerLogin();

  try {
    return publishToDocker(DHID);
  } catch (e) {
    console.error("Unable to publish images to DockerHub");
    throw e;
  }
};

const updateMigrations = async () => {
  let experimentsDir, productionDBs;
  try {
    let config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
    experimentsDir = config.experimentsDir;
    productionDBs = config.productionDBs;
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`);
    throw e;
  }
  console.log(`Handling migrations`);
  let ranMigrations, dbsToExps;
  try {
    dbsToExps = await getMigrations(path.join(process.cwd(), experimentsDir), true);
  } catch (e) {
    console.error(`Unable to run database migrations`);
    throw e;
  }
  try {
    ranMigrations = runMigrations(dbsToExps, productionDBs);
  } catch (e) {
    console.error(`Unable to run database migrations`);
    throw e;
  }
  return ranMigrations;
};

const updateECS = async () => {
  //FUBAR needs way of getting useIAM
  console.log(`Updating ECS services.`);

  let ECSName;
  try {
    let config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
    ECSName = config.ECSName;
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`);
    throw e;
  }

  const yamls = fs.readdirSync(path.join(process.cwd(), "ECSTasks"));
  return Promise.all(
    yamls.forEach((yaml) => {
      if (yaml != "ecs-params.yml") {
        let composeCommand = `ecs-cli compose -f ${yaml} -p ${yaml.split(".")[0]} service up --ecs-profile ${useIAM} --cluster-config ${ECSName} --force-deployment`;
        try {
          temp = exec(composeCommand, {
            cwd: path.join(process.cwd(), "ECStasks"),
          });
        } catch (e) {
          console.warn("\x1b[31m%s\x1b[0m", `Unable to update service ${yaml}.`);
          console.warn("\x1b[31m%s\x1b[0m", e);
        }
      }
    }),
  );
};

const handleAWSUpdate = async () => {
  console.log(`Loading deployment config`);

  let publishedToDocker;
  try {
    publishedToDocker = updateDocker();
  } catch (e) {
    throw e;
  }

  let syncMe;
  try {
    syncMe = updateS3();
  } catch (e) {
    throw e;
  }

  let ranMigrations;
  try {
    ranMigrations = updateMigrations();
  } catch (e) {
    throw e;
  }

  await Promise.all([publishedToDocker, syncMe, ranMigrations]);
  //Technically only publishedToDocker needs to finish before we update ECS
  //But waiting for everything increases that likelihood

  let compose;
  try {
    compose = updateECS();
  } catch (e) {
    throw e;
  }

  return compose; // this is a promise, so can be awaited
};

const handleCreateAutoScale = async () => {
  let projName;
  try {
    let temp = loadConfig(path.join(process.cwd(), "pushkin.yaml"));
    projName = temp.info.projName.replace(/[^A-Za-z0-9]/g, "");
  } catch (e) {
    console.error(`Unable to find project name`);
    throw e;
  }

  let useIAM;
  try {
    useIAM = await inquirer.prompt([
      {
        type: "input",
        name: "iam",
        message:
          "Provide your AWS profile username that you want to use for managing this project.",
      },
    ]);
  } catch (e) {
    console.error("Problem getting AWS IAM username.\n", e);
    throw e;
  }

  return createAutoScale(useIAM.iam, projName);
};

const handleViewConfig = async (what) => {
  moveToProjectRoot();
  let x = await ((what == "site") | !what ?
    loadConfig(path.join(process.cwd(), "pushkin.yaml"))
  : "");
  let exps = fs.readdirSync(path.join(process.cwd(), "experiments"));
  let y = await Promise.all(
    exps.map(async (exp) => {
      return (await ((what == exp) | !what)) ?
          loadConfig(path.join(process.cwd(), "experiments", exp, "config.yaml"))
        : "";
    }),
  );
  //Thanks to https://stackoverflow.com/questions/49627044/javascript-how-to-await-multiple-promises
};

const handleUpdateDB = async (verbose) => {
  if (verbose) console.log("--verbose flag set inside handleUpdateDB()");
  moveToProjectRoot();
  let settingUpDB, config;
  try {
    config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
  } catch (err) {
    console.log("Could not load pushkin.yaml");
    throw err;
  }

  try {
    settingUpDB = await setupdb(
      config.databases,
      path.join(process.cwd(), config.experimentsDir),
      verbose,
    );
  } catch (err) {
    console.error(err);
    process.exit();
  }
  return settingUpDB;
};

// For removing any .DS_Store files if present.
const removeDS = (verbose) => {
  if (verbose) {
    console.log("--verbose flag set inside removeDS()");
    console.log("Removing any .DS_Store files, if present.");
  }
  shelljs.rm("-rf", "*/.DS_Store");
  shelljs.rm("-rf", "./.DS_Store");
};

const handlePrep = async (verbose) => {
  if (verbose) console.log("--verbose flag set inside handlePrep()");
  moveToProjectRoot();
  const config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
  let out;
  if (verbose) {
    console.log(path.join(process.cwd(), config.experimentsDir));
    console.log(path.join(process.cwd(), config.coreDir));
  }
  try {
    out = await prep(
      path.join(process.cwd(), config.experimentsDir),
      path.join(process.cwd(), config.coreDir),
      verbose,
    );
  } catch (err) {
    console.error(err);
    process.exit();
  }
  return;
};

const handleAWSList = async () => {
  let useIAM;
  try {
    useIAM = await inquirer.prompt([
      {
        type: "input",
        name: "iam",
        message:
          "Provide your AWS profile username that you want to use for managing this project.",
      },
    ]);
  } catch (e) {
    console.error("Problem getting AWS IAM username.\n", e);
    process.exit();
  }
  return awsList(useIAM.iam);
};

const handleAWSKill = async () => {
  let nukeMe;
  try {
    nukeMe = await inquirer.prompt([
      {
        type: "input",
        name: "kill",
        message: `This command will DELETE your website.\n This cannot be undone.\n Are you SURE you want to do this?\n Confirm by typing 'kill my website'.`,
      },
    ]);
  } catch (e) {
    console.error("Problem getting permission.\n", e);
    process.exit();
  }
  if (nukeMe.kill != "kill my website") {
    console.log("That is probably wise. Exiting.");
    return;
  }
  let nukeMeTwice;
  try {
    nukeMeTwice = await inquirer.prompt([
      {
        type: "input",
        name: "kill",
        message: `Your database -- along with any data -- will be deleted.\n Confirm this is what you want by typing 'kill my data'.`,
      },
    ]);
  } catch (e) {
    console.error("Problem getting permission.\n", e);
    process.exit();
  }
  if (nukeMeTwice.kill != "kill my data") {
    console.log("That is probably wise. Exiting.");
    return;
  }
  console.log(`I hope you know what you are doing. This makes me nervous every time...`);
  let useIAM;
  try {
    useIAM = await inquirer.prompt([
      {
        type: "input",
        name: "iam",
        message:
          "Provide your AWS profile username that you want to use for managing this project.",
      },
    ]);
  } catch (e) {
    console.error("Problem getting AWS IAM username.\n", e);
    process.exit();
  }
  return awsArmageddon(useIAM.iam, "kill");
};

const handleAWSArmageddon = async () => {
  let nukeMe;
  try {
    nukeMe = await inquirer.prompt([
      {
        type: "input",
        name: "armageddon",
        message: `This command will delete more or less EVERYTHING on your AWS account.\n This cannot be undone.\n Are you SURE you want to do this?\n Confirm by typing 'armageddon'.`,
      },
    ]);
  } catch (e) {
    console.error("Problem getting permission.\n", e);
    process.exit();
  }
  if (nukeMe.armageddon != "armageddon") {
    console.log("That is probably wise. Exiting.");
    return;
  }
  let nukeMeTwice;
  try {
    nukeMeTwice = await inquirer.prompt([
      {
        type: "input",
        name: "armageddon",
        message: `Your database -- along with any data -- will be deleted.\n Confirm this is what you want by typing 'nuke my data'.`,
      },
    ]);
  } catch (e) {
    console.error("Problem getting permission.\n", e);
    process.exit();
  }
  if (nukeMeTwice.armageddon != "nuke my data") {
    console.log("That is probably wise. Exiting.");
    return;
  }
  console.log(`I hope you know what you are doing. This makes me nervous every time...`);
  let useIAM;
  try {
    useIAM = await inquirer.prompt([
      {
        type: "input",
        name: "iam",
        message:
          "Provide your AWS profile username that you want to use for managing this project.",
      },
    ]);
  } catch (e) {
    console.error("Problem getting AWS IAM username.\n", e);
    process.exit();
  }
  return awsArmageddon(useIAM.iam, "armageddon");
};

/**
 * Fetches all templates of a given type under a given scope from npm.
 * @param {string} scope Currently, this can only be 'pushkin-templates' (note the lack of "@").
 * @param {string} templateType Currently, this can only be 'site' or 'experiment'.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {Array<string>} An array of template names.
 */
const getTemplates = async (scope, templateType, verbose) => {
  let response;
  let body;
  let templates = [];
  if (verbose) console.log("--verbose flag set inside getTemplates()");
  if (verbose) console.log(`Fetching available ${templateType} templates`);
  try {
    // Search with npm API for all packages under given scope (250 is max number of results; 20 is default limit)
    response = await got(`https://registry.npmjs.org/-/v1/search?text=scope:${scope}&size=250`); // Allowing for flexibility in scope, in case we ever do a pushkin-contrib scope or similar
    body = JSON.parse(response.body);
    body.objects.forEach((searchResult) => {
      let template = searchResult.package.name;
      // If a template package matches the given scope and template type, add it to the list
      // Note for exp templates, templateType will be "experiment", but the package name will start with "@pushkin/template-exp-"
      if (template.startsWith(`@${scope}/${templateType === "experiment" ? "exp" : templateType}`))
        templates.push(template);
    });
    templates.sort();
  } catch (error) {
    console.error(`Problem fetching available ${templateType} templates`, error);
    process.exit(1);
  }
  return templates;
};

/**
 * Fetches all versions of a given template package from npm.
 * @param {string} packageName The name of the template package.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {object} An object containing the package name, a list of available versions, and the latest version.
 */
const getVersions = async (packageName, verbose) => {
  let response;
  let body;
  let versions = new Object();
  if (verbose) console.log("--verbose flag set inside getVersions()");
  if (verbose) console.log(`Fetching available versions of ${packageName}`);
  try {
    response = await got(`https://registry.npmjs.org/${packageName}`);
    body = JSON.parse(response.body);
    // Extract version info and add to the versions object
    versions.name = body.name; // should equal packageName, but trying not to put user input into execSync()
    versions.versionList = Object.keys(body.versions).reverse(); // reverse the list so most recent versions are first
    versions.latest = body["dist-tags"].latest;
  } catch (error) {
    console.error(`Problem fetching available versions of ${packageName}`, error);
    process.exit(1);
  }
  return versions;
};

/**
 * The primary function for installing site and experiment templates
 * @param {string} templateType "site" or "experiment"
 * @param {object} options The object of command-line options for installing without inquirer prompts
 * @param {string} options.expName The name of the experiment to be created (only for experiment templates)
 * @param {string} options.templateName The name of a published template package
 * @param {boolean} options.templatePath The path to a local template package
 * @param {string} options.templateVersion The version number or tag of a published template package
 * @param {string} options.expImport The local path to a jsPsych experiment.html (basic exp template only)
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 */
const handleInstall = async (templateType, options, verbose) => {
  if (verbose) console.log("--verbose flag set inside handleInstall()");
  /* The first major section of handleInstall() is substantially similar for site and exp templates.
  The main goals are to determine which template the user wants, install it as a dependency of their site,
  and copy the template files into the relevant directory.
  The second major section of handleInstall() is different for site and exp templates,
  since what we do with the template files differs between sites and experiments. */

  let longName; // Only for experiments
  let shortName; // Only for experiments
  let config; // Only for experiments
  let templateSource; // Will be "pushkin", "npm", or "path"
  let templatePath; // Only for installation from local path
  let templateName;
  let templateVersion;
  let importExp; // Only for import of jsPsych experiment.html with basic exp template
  let expHtmlPath; // Only for import of jsPsych experiment.html with basic exp template
  let newExpJs; // Only for import of jsPsych experiment.html with basic exp template

  if (templateType === "site") {
    // Make sure the directory is empty prior to the site install
    if (fs.readdirSync(process.cwd()).length > 0) {
      const emptyDirPrompt = await inquirer.prompt([
        {
          type: "list",
          name: "yesImSure",
          choices: [
            { name: "Yes, I'm sure.", value: true },
            {
              name: "No, I'll make a new directory and try again.",
              value: false,
            },
          ],
          default: 1,
          message:
            "The current directory already has some contents. Are you sure you want to install your site here?",
        },
      ]);
      if (!emptyDirPrompt.yesImSure) {
        process.exit(1);
      }
    }
  } else {
    // templateType === "experiment"}
    // Make sure we're in the root of the site directory
    moveToProjectRoot();
    // Check if the experiment name was provided in the command
    if (!options.expName) {
      // If not, ask the user for the name of their experiment
      const expNamePrompt = await inquirer.prompt([
        {
          type: "input",
          name: "expName",
          message: "What do you want to call your experiment?",
        },
      ]);
      longName = expNamePrompt.expName;
    } else {
      longName = options.expName;
    }
    // Make sure the experiment name begins with a letter
    if (!/^[a-zA-Z]/.test(longName)) {
      console.error("Experiment names must begin with a letter. Please choose a different name.");
      process.exit(1);
    }
    // Create a short name for the experiment
    // Remove any character that's not alphanumeric, underscore, or whitespace
    // Then replace any whitespace with underscores
    shortName = longName.replace(/[^\w\s]/g, "").replace(/\s/g, "_");
    // Check that the experiment name is not already in use
    config = await loadConfig("pushkin.yaml");
    const expNames = fs.readdirSync(path.join(process.cwd(), config.experimentsDir));
    // Compare the experiment's short name to the short names of existing experiments
    // All names must be lowercased to avoid name collisions with experiment workers (which must be lowercase)
    if (expNames.map((name) => name.toLowerCase()).includes(shortName.toLowerCase())) {
      console.error(
        "An experiment with this name (case-insensitive) already exists. Please choose a different name.",
      );
      process.exit(1);
    }
  }
  // Check whether the --template or --path flags were used
  if (!options.templateName && !options.templatePath) {
    // Ask the user where they want to get their template from
    const templateSourcePrompt = await inquirer.prompt([
      {
        type: "list",
        name: "templateSource",
        choices: [
          {
            name: "Official Pushkin distribution (@pushkin-templates)",
            value: "pushkin",
            short: "@pushkin-templates",
          },
          { name: "Elsewhere on npm", value: "npm", short: "npm" },
          { name: "Local path", value: "path", short: "path" },
        ],
        default: 0,
        message: `Where do you want to look for ${templateType} templates?`,
      },
    ]);
    templateSource = templateSourcePrompt.templateSource;
  } else if (options.templatePath) {
    templateSource = "path";
  } else {
    // In this case, they must've specified options.templateName (can't have both templateName and templatePath)
    // Probably a Pushkin template, but the procedure follows the install logic for general npm packages
    templateSource = "npm";
  }
  if (templateSource === "path") {
    if (options.templatePath) {
      // If they supplied the path, just use that
      templatePath = options.templatePath;
    } else {
      // Otherwise, ask the user for the path to their template
      const templatePathPrompt = await inquirer.prompt([
        {
          type: "input",
          name: "templatePath",
          message: `What is the path to your ${templateType} template?`,
        },
      ]);
      templatePath = path.resolve(templatePathPrompt.templatePath);
    }
    // Check that the path exists
    if (!fs.existsSync(templatePath)) {
      console.error("That path does not exist. Please try again!");
      process.exit(1);
    }
    // Extract the package.json and check that it has the necessary build script
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(path.join(templatePath, "package.json"), "utf8"));
      if (!packageJson.scripts.build || !packageJson.scripts.build.includes("build/template.zip")) {
        console.error(
          `The ${templateType} template package must have a build script that zips the template files into build/template.zip`,
        );
        process.exit(1);
      }
    } catch (e) {
      console.error("Could not parse template package.json");
      throw e;
    }
    templateName = packageJson.name;
    templateVersion = packageJson.version;
    // Make sure the package has been built
    if (verbose) console.log(`Building the ${templateType} template package`);
    execSync(`${pacMan} build`, { cwd: templatePath });
    // Locally publish the template package
    if (verbose) console.log(`Locally publishing the ${templateType} template package`);
    execSync("yalc publish", { cwd: templatePath });
  } else {
    // templateSource === "npm" || templateSource === "pushkin"
    if (templateSource === "pushkin") {
      // If the user wants an official Pushkin template, fetch a list of available ones
      // Not relevant for inquirer-less install
      const templateNames = await getTemplates("pushkin-templates", templateType, verbose);
      // Ask the user which template they want to use
      const templateNamePrompt = await inquirer.prompt([
        {
          type: "list",
          name: "templateName",
          choices: templateNames,
          message: `Which ${templateType} template would you like to use?`,
        },
      ]);
      templateName = templateNamePrompt.templateName;
    } else {
      // templateSource === "npm"
      if (options.templateName) {
        // If the template name was provided as a command-line option, use that
        templateName = options.templateName;
      } else {
        // Otherwise, ask the user for the npm package for their template
        const npmTemplateNamePrompt = await inquirer.prompt([
          {
            type: "input",
            name: "npmTemplateName",
            message: "What is the name of the npm package?",
          },
        ]);
        templateName = npmTemplateNamePrompt.npmTemplateName;
      }
    }

    if (options.templateVersion) {
      // If the template version was provided as a command-line option, use that
      templateVersion = options.templateVersion;
    } else {
      // Otherwise, fetch available versions of the template package
      const templateVersions = await getVersions(templateName, verbose);
      // Ask the user which version they want to use
      const templateVersionPrompt = await inquirer.prompt([
        {
          type: "list",
          name: "templateVersion",
          choices: templateVersions.versionList,
          default: templateVersions.latest,
          // If the user is using an official Pushkin site template, recommend the latest version
          message: `Which version would you like to use?${templateSource === "pushkin" ? ` (Recommended: ${templateVersions.latest})` : ""}`,
        },
      ]);
      templateVersion = templateVersionPrompt.templateVersion;
    }
  }

  // If the user is installing a site template, initialize the user's site directory as a private package
  if (templateType === "site") {
    await initSite(verbose);
  }

  // If the user is installing the basic experiment template, ask if they want to import a jsPsych experiment.html
  if (templateType === "experiment" && templateName === "@pushkin-templates/exp-basic") {
    // Check if the options object has the expImport property (even if false)
    if (options.expImport === undefined) {
      // If the expImport flag is undefined run interactively
      const importExpPrompt = await inquirer.prompt([
        {
          type: "confirm",
          name: "importExp",
          default: false,
          message: "Would you like to import a jsPsych experiment.html?",
        },
      ]);
      importExp = importExpPrompt.importExp;
      if (importExp) {
        const expHtmlPathPrompt = await inquirer.prompt([
          {
            type: "input",
            name: "expHtmlPath",
            message: "What is the path to your experiment.html?",
          },
        ]);
        expHtmlPath = expHtmlPathPrompt.expHtmlPath;
      }
    } else {
      if (options.expImport) {
        // The property will be true if they supplied a path through the command line
        importExp = true;
        expHtmlPath = options.expImport;
      } else {
        // If the user supplied flags to use a local or published template,
        // the expImport flag will be false
        importExp = false;
      }
    }
    if (importExp) {
      if (!expHtmlPath) {
        console.log("No path provided to jsPsych experiment; installing the basic template as is.");
      } else if (!fs.existsSync(expHtmlPath) || !fs.lstatSync(expHtmlPath).isFile()) {
        console.error("Invalid file path to jsPsych experiment; please try again.");
        process.exit(1);
      } else {
        // Handle relative paths
        expHtmlPath = path.resolve(expHtmlPath);
        // If the path looks valid, try to import the jsPsych experiment.html
        const expHtmlPlugins = getJsPsychPlugins(expHtmlPath, verbose);
        // If you wanted to add a feature to ask the user if there are additional plugins they want,
        // here would probably be the place to implement it.
        const expHtmlImports = getJsPsychImports(expHtmlPlugins, verbose);
        const expHtmlTimeline = getJsPsychTimeline(expHtmlPath, verbose);
        if (expHtmlImports && expHtmlTimeline) {
          // Create the necessary import statements from the object of jsPsych plugins
          let imports = "";
          Object.keys(expHtmlImports).forEach((plugin) => {
            // Check if plugin specifies version (i.e. 'Is there another "@" after initial one?')
            if (plugin.slice(1).includes("@")) {
              let pluginNoVersion = "@" + plugin.split("@")[1]; // [1] will be the plugin name, add back leading '@'
              let pluginVersion = plugin.split("@")[2]; // [2] will be the version number
              // Add version info as a comment after the import statement (to be read by prep later)
              imports = imports.concat(
                `import ${expHtmlImports[plugin]} from '${pluginNoVersion}'; // version:${pluginVersion} //\n`,
              );
            } else {
              imports = imports.concat(`import ${expHtmlImports[plugin]} from '${plugin}';\n`);
            }
          });
          newExpJs = `${imports}\nexport function createTimeline(jsPsych) {\n${expHtmlTimeline}\nreturn timeline;\n}\n`;
        } else {
          if (options.expImport) {
            // If the user gave a path through the command line, we should exit,
            // just error out and let the template install fail
            // This will be run in a test/CI environment, so we don't want prompts
            console.error("Problem importing jsPsych experiment.html");
            process.exit(1);
          } else {
            // If the command is running interactively,
            // ask the user if they want to install the basic template as is
            const importErrorPrompt = await inquirer.prompt([
              {
                type: "confirm",
                name: "installBasic",
                default: false,
                message:
                  "There was a problem importing your experiment.html. Would you like to install the basic template as is?",
              },
            ]);
            if (!importErrorPrompt.installBasic) {
              process.exit(1);
            }
          }
        }
      }
    }
  }

  // Add and install the package (this should work even for repeat installs of the same exp template)
  if (verbose) console.log(`Installing the ${templateType} template package`);
  try {
    execSync(
      `${templateSource === "path" ? "yalc" : pacMan} add ${templateName}@${templateVersion} --dev && ${pacMan} install`,
    );
  } catch (e) {
    console.error(`Problem installing the ${templateType} template package`);
    throw e;
  }
  // Unzip the template files into the appropriate directory
  if (verbose) console.log(`Unzipping template files into ${templateType} directory`);
  try {
    // On some systems, we noticed the unzip command seemingly trying to execute before the install command was finished.
    // The attempted fix is the following:
    // Check if the path to the zip archive in node_modules exists
    if (fs.existsSync(`node_modules/${templateName}/build/template.zip`)) {
      // If so, unzip it into the main site folder or the experiment folder, depending on the template type
      execSync(
        `unzip node_modules/${templateName}/build/template.zip ${templateType === "experiment" ? `-d ${path.join(config.experimentsDir, shortName)}` : ""}`,
      );
    } else {
      // Otherwise, wait 5 seconds and try to unzip it
      await new Promise((resolve) => setTimeout(resolve, 5000));
      execSync(
        `unzip node_modules/${templateName}/build/template.zip ${templateType === "experiment" ? `-d ${path.join(config.experimentsDir, shortName)}` : ""}`,
      );
    }
  } catch (e) {
    console.error(`Problem unzipping ${templateType} template files`);
    throw e;
  }

  // At this point, the behavior of handleInstall() diverges significantly for site and experiment templates
  if (templateType === "site") {
    // Set up the template files
    if (verbose) console.log("Setting up site template files");
    await setupPushkinSite(verbose);
    if (verbose) console.log("Finished setting up site template files");
    // Set up the transactions database
    if (verbose) console.log("setting up transactions db");
    await setupTestTransactionsDB(verbose); // Not distributed with sites since it's the same for all of them.
  } else {
    // templateType === "experiment"
    if (verbose) console.log("Setting up experiment template files");
    await setupPushkinExp(
      longName,
      shortName,
      path.join(config.experimentsDir, shortName),
      process.cwd(),
      verbose,
    );
    // Overwrite experiment.js with the imported jsPsych experiment if desired
    if (newExpJs) {
      if (verbose) console.log(`Writing new experiment.js file`);
      fs.writeFileSync(
        path.join(process.cwd(), config.experimentsDir, shortName, "web page/src/experiment.js"),
        newExpJs,
      );
    }
  }
};

const handleAWSInit = async (force) => {
  let DHID;
  try {
    DHID = await dockerLogin();
  } catch (error) {
    console.log(error);
    process.exit();
  }

  let config;
  try {
    config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`);
    throw e;
  }

  let projName, useIAM, awsName, stdOut;

  try {
    execSync("aws --version");
  } catch (e) {
    console.error("Please install the AWS CLI before continuing.");
    process.exit();
  }

  let newProj = true;
  if (config.info.projName) {
    let myChoices = config.info.projName ? [config.info.projName, "new"] : ["new"];
    try {
      projName = await inquirer.prompt([
        {
          type: "list",
          name: "name",
          choices: myChoices,
          message: "Which project?",
        },
      ]);
    } catch (e) {
      throw e;
    }
    if (projName.name != "new") {
      newProj = false;
      awsName = config.info.awsName;
    }
    if (force) {
      try {
        //Run this anyway to reset awsResources.js and remove productionDBs from pushkin.yaml
        awsName = await nameProject(projName.name);
      } catch (e) {
        throw e;
      }
    }
  }

  if (newProj) {
    try {
      projName = await inquirer.prompt([
        { type: "input", name: "name", message: "Name your project" },
      ]);
    } catch (e) {
      console.error(e);
      process.exit();
    }
    try {
      awsName = await nameProject(projName.name);
    } catch (e) {
      throw e;
    }
  }

  try {
    useIAM = await inquirer.prompt([
      {
        type: "input",
        name: "iam",
        message:
          "Provide your AWS profile username that you want to use for managing this project.",
      },
    ]);
  } catch (e) {
    console.error("Problem getting AWS IAM username.\n", e);
    process.exit();
  }
  try {
    stdOut = execSync(`aws configure list --profile ${useIAM.iam}`).toString();
  } catch (e) {
    console.error(
      `The IAM user ${useIAM.iam} is not configured on the AWS CLI. For more information see https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html`,
    );
    process.exit();
  }
  let addedIAM;
  try {
    addedIAM = addIAM(useIAM.iam); //this doesn't need to be synchronous
  } catch (e) {
    console.error(e);
    process.exit();
  }
  try {
    await Promise.all([awsInit(projName.name, awsName, useIAM.iam, config.DockerHubID), addedIAM]);
  } catch (e) {
    throw e;
  }
  console.log("finished aws init");

  return;
};

const killLocal = async () => {
  console.log(
    "Removing all containers and volumes, as well as pushkin images. To additionally remove third-party images, run `pushkin armageddon`.",
  );
  moveToProjectRoot();
  try {
    await compose.stop({
      cwd: path.join(process.cwd(), "pushkin"),
      config: "docker-compose.dev.yml",
    });
  } catch (err) {
    console.error("Problem with stopping docker: ", err);
    process.exit();
  }
  try {
    await compose.rm({
      cwd: path.join(process.cwd(), "pushkin"),
      config: "docker-compose.dev.yml",
    });
  } catch (err) {
    console.error("Problem with removing docker containers: ", err);
    process.exit();
  }
  try {
    await exec(
      `docker volume rm pushkin_test_db_volume pushkin_message_queue_volume; docker images -a | grep "_worker" | awk '{print $3}' | xargs docker rmi -f`,
    );
    await exec(`docker rmi -f api`);
    await exec(`docker rmi -f server`);
  } catch (err) {
    console.error("Problem with removing volumes and images docker: ", err);
    process.exit();
  }
  console.log("Completed kill");
  return;
};

/**
 * The primary function for deleting and archiving/unarchiving experiments
 * @param {string[]} experiments The (short) names of the experiments to be removed
 * @param {string} mode The mode of removal ("delete", "archive", "unarchive", "pause-data", or "unpause-data")
 * @param {boolean} force Whether to suppress the deletion confirmation prompt
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 */
const handleRemove = async (experiments, mode, force, verbose) => {
  if (verbose) console.log("--verbose flag set inside handleRemove()");
  // Make sure we're in the root of the site directory
  moveToProjectRoot();
  // Load the pushkin.yaml file
  const config = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), "pushkin.yaml"), "utf8"));
  // Get the path to the experiments directory
  const expDir = path.join(process.cwd(), config.experimentsDir);
  // Check that the experiments directory exists
  if (!fs.existsSync(expDir)) {
    console.error(`Experiments folder (${expDir}) not found.`);
    process.exit(1);
  }
  const expsToRemove = [];
  // Check that all specified experiments exist
  if (experiments && experiments.length > 0) {
    experiments.forEach((exp) => {
      if (!fs.existsSync(path.join(expDir, exp))) {
        console.error(`Experiment ${exp} not found.`);
        process.exit(1);
      }
    });
    expsToRemove.push(...experiments);
  } else {
    // If no experiments were specified, ask which ones the user wants to remove
    const expList = fs.readdirSync(expDir);
    const expPrompt = await inquirer.prompt([
      {
        type: "checkbox",
        name: "expsToRemove",
        message: "Select one or more experiments to remove:",
        choices: expList,
      },
    ]);
    expsToRemove.push(...expPrompt.expsToRemove);
  }
  // Exit if no experiments were selected
  if (expsToRemove.length === 0) {
    console.log("No experiments were selected for removal.");
    process.exit();
  }

  // If the mode was not specified, ask the user whether they want to delete, archive, or unarchive the experiment(s)
  let removeMode;
  if (mode) {
    removeMode = mode;
  } else {
    const modePrompt = await inquirer.prompt([
      {
        type: "list",
        name: "mode",
        message: "What would you like to do with the experiment(s)?",
        choices: [
          { name: "Delete", value: "delete" },
          { name: "Archive", value: "archive" },
          { name: "Unarchive", value: "unarchive" },
          { name: "Pause data collection", value: "pause-data" },
          { name: "Unpause data collection", value: "unpause-data" },
        ],
      },
    ]);
    removeMode = modePrompt.mode;
  }

  // If the mode is delete, ask the user for confirmation
  if (removeMode === "delete" && !force) {
    const confirmPrompt = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmDelete",
        default: false,
        message: `This action will permanently delete the following experiments:\n - ${expsToRemove.join("\n - ")}\nThis action cannot be undone. Are you sure you want to proceed?`,
      },
    ]);
    if (!confirmPrompt.confirmDelete) {
      console.log("No experiments were deleted.");
      process.exit();
    }
  }

  try {
    let removedExps;
    const expPaths = expsToRemove.map((exp) => path.join(expDir, exp));
    if (removeMode === "delete") {
      if (verbose) console.log("Deleting experiment(s)...");
      // deleteExperiment() returns a promise for each deleted experiment
      removedExps = expPaths.map((expPath) => deleteExperiment(expPath, verbose));
      // Add another promise to update the docker-compose file
      removedExps.push(removeExpWorkers(expsToRemove, verbose));
      // Remove the experiments' web and api packages from the site's web and api packages
      // COME BACK TO THIS
      // For some reason, removing the unneeded _web and _api packages is breaking all the site's experiments
      // if (verbose) console.log('Removing experiment(s) from site front-end and api components')
      // const webPackages = expsToRemove.map(exp => exp.concat('_web'));
      // const apiPackages = expsToRemove.map(exp => exp.concat('_api'));
      // execSync(`yalc remove ${webPackages.join(' ')}`, { cwd: path.join(process.cwd(), 'pushkin/front-end') });
      // execSync(`yalc remove ${apiPackages.join(' ')}`, { cwd: path.join(process.cwd(), 'pushkin/api') });
    } else if (removeMode === "archive") {
      if (verbose) console.log("Archiving experiment(s)...");
      // Similarly create an array of promises using archiveExperiment()
      removedExps = expPaths.map((expPath) =>
        updateExpConfig(expPath, { archived: true }, verbose),
      );
    } else if (removeMode === "unarchive") {
      if (verbose) console.log("Unarchiving experiment(s)...");
      removedExps = expPaths.map((expPath) =>
        updateExpConfig(expPath, { archived: false }, verbose),
      );
    } else if (removeMode === "pause-data") {
      if (verbose) console.log("Pausing data collection for experiment(s)...");
      removedExps = expPaths.map((expPath) =>
        updateExpConfig(expPath, { dataPaused: true }, verbose),
      );
    } else {
      // removeMode === 'unpause-data'
      if (verbose) console.log("Unpausing data collection for experiment(s)...");
      removedExps = expPaths.map((expPath) =>
        updateExpConfig(expPath, { dataPaused: false }, verbose),
      );
    }

    await Promise.all(removedExps);

    if (removeMode === "delete") {
      // Kill all Pushkin Docker containers and images
      killLocal(); // Putting this here for now, since it needs to read the compose file
      console.log(`Experiment(s) successfully deleted`);
    } else if (removeMode.endsWith("pause-data")) {
      console.log(
        `Success! Data collection for experiment(s) will be ${removeMode.split("-")[0]}d after you run \`pushkin prep\``,
      );
    } else {
      console.log(`Success! Experiment(s) will be ${removeMode}d after you run \`pushkin prep\``);
    }
  } catch (e) {
    console.error("Problem removing experiment(s)", e);
    throw e;
  }
};

/**
 * Writes the previously used published version of a Pushkin utility package to file before updating to a dev version
 * @param {string} pkg The Pushkin utility package to substitute
 * @param {string} location Either "main site" or the name of an experiment
 * @param {string} component The site or experiment component to update
 * @param {string} componentPath The path to the particular site or experiment component
 * @param {boolean} revert Revert to the previously used published versions of Pushkin utilities
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 */
const addDevPackage = (pkg, location, component, componentPath, revert, verbose) => {
  if (verbose) console.log("--verbose flag set inside addDevPackage()");
  // Write the published version to file for use with the --revert flag
  let pkgJson;
  try {
    pkgJson = JSON.parse(fs.readFileSync(path.join(componentPath, "package.json"), "utf8"));
  } catch (e) {
    console.error(`Problem reading package.json in ${location} ${component}`, e);
    process.exit(1);
  }
  if (!revert) {
    const publishedVersion = pkgJson.dependencies[pkg];
    // Don't write the file if the package is already a local dev version
    if (!publishedVersion.startsWith("file:")) {
      if (verbose) console.log(`Recording previous version of ${pkg} in ${location} ${component}`);
      try {
        fs.promises.writeFile(path.join(componentPath, `.${pkg}-revert-version`), publishedVersion);
      } catch (e) {
        console.error(`Problem writing .${pkg}-revert-version in ${location} ${component}`, e);
        process.exit(1);
      }
    }
  }
  // For the experiment component packages, edit the `files` property
  if (location !== "main site") {
    if (verbose) console.log(`Updating package.json "files" array in ${location} ${component}`);
    let updatePkgJson = false;
    if (revert) {
      // If reverting, .yalc should be removed from the `files` array in package.json
      if (pkgJson.files && pkgJson.files.includes(".yalc")) {
        pkgJson.files = pkgJson.files.filter((file) => file !== ".yalc");
        updatePkgJson = true;
      } else {
        console.log(`${location} ${component} "files" array does not include ".yalc"`);
      }
    } else {
      // If not reverting, .yalc should be added to the `files` array in package.json
      if (!pkgJson.files) {
        // Worker components don't have a `files` property yet
        pkgJson.files = [".yalc"];
        updatePkgJson = true;
      } else if (!pkgJson.files.includes(".yalc")) {
        // For other components, check if .yalc is already included `files`
        pkgJson.files.push(".yalc");
        updatePkgJson = true;
      } else {
        // Otherwise, .yalc has already been added to `files`
        if (verbose) console.log(`${location} ${component} "files" array already includes ".yalc"`);
      }
    }
    if (updatePkgJson) {
      try {
        // Using synchronous write here, since yalc needs to read/write the package.json file too
        fs.writeFileSync(
          path.join(componentPath, "package.json"),
          JSON.stringify(pkgJson, null, 2),
        );
      } catch (e) {
        console.error(`Problem updating package.json "files" array in ${location} ${component}`, e);
        process.exit(1);
      }
    }
  }

  if (revert) {
    // Revert to the previously used published version of the package
    try {
      if (verbose)
        console.log(
          `Removing dev version and reverting to published version of ${pkg} in ${location} ${component}`,
        );
      const revertVersion = fs.readFileSync(
        path.join(componentPath, `.${pkg}-revert-version`),
        "utf8",
      );
      execSync(`yalc remove ${pkg} && ${pacMan} add ${pkg}@${revertVersion}`, {
        cwd: componentPath,
      });
    } catch (e) {
      console.error(
        `Problem reverting to published version of ${pkg} in ${location} ${component}`,
        e,
      );
      process.exit(1);
    }
  } else {
    // Substitute the local dev version of the package
    if (verbose) console.log(`Adding dev version of ${pkg} in ${location} ${component}`);
    try {
      execSync(`yalc add ${pkg}`, { cwd: componentPath });
    } catch (e) {
      console.error(`Problem adding dev version of ${pkg} in ${location} ${component}`, e);
      process.exit(1);
    }
  }
};

/**
 * Updates the experiment worker's Dockerfile to copy yalc-related files
 * @param {string} experiment The name of an experiment
 * @param {string} componentPath The path to the experiment's worker component
 * @param {boolean} revert Remove copying of yalc-related files from the Dockerfile
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 */
const updateWorkerDockerfile = (experiment, componentPath, revert, verbose) => {
  if (verbose) console.log("--verbose flag set inside updateWorkerDockerfile()");
  if (verbose) console.log(`Updating Dockerfile for ${experiment} worker`);
  let dockerfile;
  let updatedDockerfile;
  try {
    dockerfile = fs.readFileSync(path.join(componentPath, "Dockerfile"), "utf8");
  } catch (e) {
    console.error(`Problem reading Dockerfile in ${experiment} worker`, e);
    process.exit(1);
  }
  // Lines to be added to the Dockerfile to copy yalc-related files
  const copyYalc = "COPY .yalc /usr/src/app/.yalc/\nCOPY ./yalc.lock /usr/src/app/";
  if (revert) {
    // If reverting, remove the lines that copy yalc-related files
    if (dockerfile.includes(copyYalc)) {
      updatedDockerfile = dockerfile.replace(copyYalc + "\n", "");
    } else {
      console.log(`yalc-related files already omitted from Dockerfile for ${experiment} worker`);
      updatedDockerfile = dockerfile;
    }
  } else {
    // Otherwise, check if lines to copy yalc files are already present
    if (!dockerfile.includes(copyYalc)) {
      // If not, add them by splitting the Dockerfile into lines,
      const lines = dockerfile.split("\n");
      // finding the line with the COPY command
      const copyLineIndex = lines.findIndex((line) => line.startsWith("COPY"));
      // and inserting the new lines after it
      lines.splice(copyLineIndex + 1, 0, copyYalc);
      updatedDockerfile = lines.join("\n");
    } else {
      console.log(`Dockerfile for ${experiment} worker already copies yalc-related files`);
      updatedDockerfile = dockerfile;
    }
  }
  // If the Dockerfile needs to be updated, write the changes to the file
  if (updatedDockerfile !== dockerfile) {
    try {
      fs.promises.writeFile(path.join(componentPath, "Dockerfile"), updatedDockerfile);
    } catch (e) {
      console.error(`Problem updating Dockerfile for ${experiment} worker`, e);
      process.exit(1);
    }
  }
};

/**
 * The main function for the `use-dev` command
 * Substitutes a local development version of a Pushkin utility package
 * @param {string[]} packages The Pushkin utility packages to substitute
 * @param {string} pkgsPath The path to the directory containing the dev Pushkin packages
 * @param {string[]} workerExps The experiments to update with a dev version of pushkin-worker
 * @param {boolean} update Push updates to dev utility packages already in place
 * @param {boolean} revert Revert to the previously used published versions of Pushkin utilities
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 */
const handleUseDev = (packages, pkgsPath, workerExps, update, revert, verbose) => {
  if (verbose) console.log("--verbose flag set inside handleUseDev()");
  for (const pkg of packages) {
    // Using a for loop here instead of forEach() to loop over the packages
    // since it seemed like there were race conditions related to the yalc commands,
    // specifically with yalc writing to the installations.json file in the local package store
    if (!revert) {
      // Build and locally publish the specified package(s)
      if (verbose) console.log(`Building and locally publishing ${pkg}`);
      try {
        // If the user is updating the dev version, `yalc push` is all they need
        const yalcCommand = update ? "push" : "publish";
        execSync(`yarn build && yalc ${yalcCommand}`, { cwd: path.join(pkgsPath, pkg) });
        if (verbose && update) console.log(`Pushed updates to dev ${pkg}`);
      } catch (e) {
        console.error(`Problem building or locally publishing ${pkg}`, e);
        process.exit(1);
      }
    }
    // That should be it if the user is just updating a dev version that's already in place
    if (!update) {
      // Edit the relevant site files to use the local dev version of the specified package(s)
      if (pkg !== "pushkin-worker") {
        // Update the main site components for the api and front-end
        const siteComponent = pkg === "pushkin-api" ? "api" : "front-end";
        const siteComponentPath = path.join(process.cwd(), "pushkin", siteComponent);
        addDevPackage(pkg, "main site", siteComponent, siteComponentPath, revert, verbose);
      }
      // Loop over the site's experiments, adding the local dev version of the package
      const expDir = path.join(process.cwd(), "experiments");
      // If the package is pushkin-worker and the --experiments option was used, only update the specified experiments
      const exps = pkg === "pushkin-worker" && workerExps ? workerExps : fs.readdirSync(expDir);
      for (const exp of exps) {
        // See comment above about using a for loop instead of forEach() to avoid race conditions
        const componentMap = {
          "pushkin-client": "web page",
          "pushkin-api": "api controllers",
          "pushkin-worker": "worker",
        };
        const expComponent = componentMap[pkg];
        const expComponentPath = path.join(expDir, exp, expComponent);
        // Record the previous version of the package and add the dev version
        addDevPackage(pkg, exp, expComponent, expComponentPath, revert, verbose);
        // If using a dev worker, the worker's Dockerfile also needs to be updated
        if (pkg === "pushkin-worker") {
          updateWorkerDockerfile(exp, expComponentPath, revert, verbose);
        }
      }
    }
  }
};

/**
 * The entry point for `pushkin` commands
 * See commander documentation (https://www.npmjs.com/package/commander)
 */
async function main() {
  program
    .command("install")
    .alias("i")
    .addArgument(
      new commander.Argument("<template_type>", "Type of template to install").choices([
        "site",
        "experiment",
        "exp",
      ]),
    )
    .option("--expName <name>", "The name of the experiment to create") // only for exp templates
    .addOption(
      new commander.Option("--template <template>", "The name of a published template to install")
        .conflicts("path") // published template precludes specifying a local template
        // Assume no jsPsych experiment import if no path specified (can be overridden with expImport flag)
        // Assume latest release if no version specified
        .implies({ expImport: false, release: "latest" }),
    )
    .addOption(
      new commander.Option("--path <path>", "The path to a local template to install")
        .conflicts(["template", "release"]) // local template precludes specifying an npm release
        // Assume no jsPsych experiment import if no path specified (can be overridden with expImport flag)
        .implies({ expImport: false }),
    )
    .addOption(
      new commander.Option(
        "--release <release>",
        "The release number or tag of a published template",
      )
        .conflicts("path") // local template precludes specifying an npm release
        // Assume no jsPsych experiment import if no path specified (can be overridden with expImport flag)
        .implies({ expImport: false }),
    )
    .addOption(
      new commander.Option(
        "--expImport <expPath>",
        "The path to a jsPsych experiment.html to import",
      ).implies({ template: "@pushkin-templates/exp-basic" }), // expImport only relevant for basic exp template
    )
    .addOption(
      new commander.Option(
        "-a, --all <source>",
        "Install all available experiment templates from a given source",
      ).conflicts(["expName, template", "path", "release", "expImport"]),
    )
    .option("-v, --verbose", "Output extra debugging info")
    .description(`Install website ('site') or experiment template.`)
    .action(async (template_type, options) => {
      // Argument and option pre-processing
      const templateType = template_type === "exp" ? "experiment" : template_type;
      if (templateType === "site") {
        if (options.expName || options.expImport || options.all) {
          console.error(
            "Error: The options --expName, expImport, and --all can only be used with experiment templates",
          );
          process.exit(1);
        }
      }
      if (options.expImport && options.template !== "@pushkin-templates/exp-basic") {
        console.error(
          "Error: The --expImport option can only be used with the basic experiment template",
        );
        process.exit(1);
      }
      // Basic checking of the path option
      if (options.path) {
        if (!fs.existsSync(options.path) || !fs.lstatSync(options.path).isDirectory()) {
          console.error(`Error: The path ${options.path} is not a valid directory`);
          process.exit(1);
        }
      }
      if (options.all) {
        // Pre-processing for the --all option
        const allPath = path.resolve(options.all);
        let optionsToPass = []; // This will be an array of options objects to be passed to handleInstall()
        let templateList;
        // Check whether the source is a valid local path
        if (
          fs.existsSync(allPath) &&
          fs.lstatSync(allPath).isDirectory() &&
          allPath.endsWith("pushkin/templates/experiments")
        ) {
          templateList = fs.readdirSync(allPath);
          templateList.forEach((template) => {
            // Check that the supplied path contains only directories
            if (!fs.lstatSync(path.join(allPath, template)).isDirectory()) {
              console.error(`Error: The path ${allPath} contains non-directory files`);
              process.exit(1);
            }
            // Add the options array needed to install that template
            optionsToPass.push({
              // Add "_path" to the expName to avoid name conflicts with exps installed with `--all latest`
              expName: template + "_path",
              templatePath: path.join(allPath, template),
              expImport: false, // Blocks jsPsych experiment import prompt for basic template
            });
          });
        } else if (options.all === "latest") {
          templateList = await getTemplates("pushkin-templates", "experiment", options.verbose);
          console.log(templateList);
          templateList.forEach((template) => {
            optionsToPass.push({
              // Trim off the @pushkin-templates/exp- prefix from expName and
              // Add "_latest" to avoid name conflicts with exps installed with `--all path`
              expName: template.split("/exp-")[1] + "_latest",
              templateName: template,
              templateVersion: "latest",
              expImport: false, // Blocks jsPsych experiment import prompt for basic template
            });
          });
        } else {
          console.error(
            `Error: The --all option must be followed by "latest" or a valid local path ending in "pushkin/templates/experiments"`,
          );
          process.exit(1);
        }
        // Install all the templates
        // Use a for loop to ensure that the templates are installed sequentially
        // .forEach() could lead to race conditions or file write conflicts
        for (let installOptions of optionsToPass) {
          try {
            await handleInstall("experiment", installOptions, options.verbose);
          } catch (e) {
            console.error(`Experiment installation failed for ${installOptions.expName}`, e);
            process.exit(1);
          }
        }
      } else {
        // Not using the --all option
        try {
          handleInstall(
            templateType,
            {
              expName: options.expName,
              templateName: options.template,
              templatePath: options.path ? path.resolve(options.path) : options.path,
              templateVersion: options.release,
              expImport: options.expImport,
            },
            options.verbose,
          );
        } catch (e) {
          console.error(`Experiment installation failed for ${options.expName}`, e);
          process.exit(1);
        }
      }
    });

  program
    .command("remove <what>")
    .alias("rm")
    .description(
      `Delete, (un)archive, or (un)pause a Pushkin experiment. Deletion permanently removes all the experiment's files and data; archiving simply removes the experiment from the front end; pausing stops data collection but leaves the experiment's front end in place.`,
    )
    .option("-e, --experiments [experiments...]", "Specify which experiment(s) to remove")
    .option(
      "-m, --mode [mode]",
      "Specify whether to delete, (un)archive, or (un)pause the experiment(s)",
    )
    .option("-f, --force", "Suppresses confirmation prompt when deleting experiments")
    .option("-v, --verbose", "Output extra debugging info")
    .action(async (what, options) => {
      // Check that `remove` argument is valid
      if (what === "exp" || what === "experiment") {
        // Check that mode is valid (if provided)
        const modes = ["delete", "archive", "unarchive", "pause-data", "unpause-data"];
        if (options.mode && !modes.includes(options.mode)) {
          console.error(`Invalid mode. Mode must be one of:\n -${modes.join("\n -")}`);
          process.exit(1);
        }
        try {
          await handleRemove(options.experiments, options.mode, options.force, options.verbose);
        } catch (e) {
          console.error("Problem removing experiment(s):", e);
          process.exit(1);
        }
      } else {
        console.error('Invalid argument. Currently, you can only remove "experiment" (or "exp").');
        process.exit(1);
      }
    });

  program
    .command("use-dev")
    .description("Use a local development version of the specified Pushkin utility package(s)")
    .addArgument(
      new commander.Argument(
        "<packages...>",
        "The Pushkin utility package(s) for which you want to subtitute a local development version",
      ).choices(["api", "pushkin-api", "client", "pushkin-client", "worker", "pushkin-worker"]),
    )
    .addOption(
      new commander.Option(
        "-p, --path <path>",
        "The path to the `packages` directory in your local clone of the pushkin repository",
      ).conflicts("revert"),
    )
    .option(
      "-e, --experiments <experiments...>",
      "The experiment(s) in which you want to use a dev version of pushkin-worker (defaults to all experiments)",
    )
    .addOption(
      new commander.Option(
        "-u, --update",
        "Push additional local updates to the specified Pushkin utility package(s) in your site",
      ).conflicts("revert"),
    )
    .addOption(
      new commander.Option(
        "--revert",
        "Revert to the previously used published version of the specified Pushkin utility package(s)",
      ).conflicts(["update", "path"]),
    )
    .option("-v, --verbose", "Output extra debugging info")
    .action((packages, options) => {
      const packagesPath = options.path ? path.resolve(options.path) : undefined;
      // Make sure we're in the root of the site directory
      moveToProjectRoot();
      // Make sure there are no DS_Store files
      removeDS(options.verbose);
      // Check that the path is valid
      if (!options.revert) {
        if (
          !fs.existsSync(packagesPath) ||
          !fs.lstatSync(packagesPath).isDirectory() ||
          !packagesPath.endsWith("pushkin/packages")
        ) {
          console.error("The specified path is invalid; it must end with 'pushkin/packages'.");
          process.exit(1);
        }
      }
      // Pre-processing of the packages list (add 'pushkin-' prefix if necessary and remove duplicates)
      const packageList = [
        ...new Set(packages.map((pkg) => (pkg.startsWith("pushkin-") ? pkg : `pushkin-${pkg}`))),
      ];
      if (options.experiments) {
        // Check that the experiments list is valid
        const expDir = path.join(process.cwd(), "experiments");
        options.experiments.forEach((exp) => {
          if (
            !fs.existsSync(path.join(expDir, exp)) ||
            !fs.lstatSync(path.join(expDir, exp)).isDirectory()
          ) {
            console.error(`Experiment ${exp} does not exist.`);
            process.exit(1);
          }
        });
        // Only pushkin-worker can be experiment-specific
        if (!packageList.includes("pushkin-worker")) {
          console.error(
            "The --experiments flag can only be used in combination with a dev pushkin-worker.",
          );
          process.exit(1);
        }
      }
      // Integrate the dev package(s) into the site
      handleUseDev(
        packageList,
        packagesPath,
        options.experiments,
        options.update,
        options.revert,
        options.verbose,
      );
    });

  program
    .command("aws <cmd>")
    .description(
      `For working with AWS. Commands include:\n 
      init: initialize an AWS deployment.\n 
      update: update an AWS deployment.\n
      armageddon: delete AWS resources created by Pushkin.\n
      list: list AWS resources created by Pushkin (and possibly others).`,
    )
    .option(
      "-f, --force",
      "Applies only to init. Resets installation options. Does not delete AWS resources (for that, use aws armageddon).",
      false,
    )
    .option("-v, --verbose", "output extra debugging info")
    .action(async (cmd, options) => {
      moveToProjectRoot();
      switch (cmd) {
        case "init":
          try {
            setEnv(false, options.verbose); // synchronous
            await handleAWSInit(options.force);
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        case "update":
          try {
            //await handleAWSUpdate();
            console.warn("\x1b[31m%s\x1b[0m", `Not currently implemented. Sorry.`);
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        case "armageddon":
          try {
            await handleAWSArmageddon();
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        case "list":
          try {
            await handleAWSList();
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        default:
          console.error("Command not recognized. For help, run 'pushkin help aws'.");
      }
    });

  program
    .command("setDockerHub")
    .description(`Set (or change) your DockerHub ID. This must be run before deploying to AWS.`)
    .action(() => {
      moveToProjectRoot();
      inquirer
        .prompt([{ type: "input", name: "ID", message: "What is your DockerHub ID?" }])
        .then(async (answers) => {
          let config;
          try {
            config = await loadConfig(path.join(process.cwd(), "pushkin.yaml"));
          } catch (e) {
            console.error(e);
            process.exit();
          }
          config.DockerHubID = answers.ID;
          try {
            fs.writeFileSync(path.join(process.cwd(), "pushkin.yaml"), jsYaml.safeDump(config));
          } catch (e) {
            console.error("Unable to rewrite pushkin.yaml.");
            console.error(e);
            process.exit();
          }
          inquirer
            .prompt([
              {
                type: "input",
                name: "pw",
                message: "What is your DockerHub password?",
              },
            ])
            .then(async (answers) => {
              fs.writeFileSync(".docker", answers.pw, (err) => {
                if (err) {
                  console.error(err);
                }
                // file written successfully
              });
            });
        });
    });

  program
    .command("prep")
    .description(
      "Prepares local copy for local testing. This step includes running migrations, so be sure you have read the documentation on how that works.",
    )
    .option("--no-migrations", "Do not run migrations. Be sure database structure has not changed!")
    .option(
      "-p, --production",
      "Run with front-end env var `debug`=false. Do this before deploying to AWS.",
    )
    .option("-v, --verbose", "output extra debugging info")
    .action(async (options) => {
      let awaits;
      removeDS(options.verbose);
      try {
        if (options.production) {
          setEnv(false, options.verbose);
        } else {
          setEnv(true, options.verbose);
        }
      } catch (e) {
        console.error("Problem setting front-end environment variable:", e);
        process.exit(1);
      }
      try {
        if (options.migrations) {
          // options.migrations===true by default because of --no-migrations flag
          //running prep and updating DB
          awaits = [handlePrep(options.verbose), handleUpdateDB(options.verbose)];
        } else {
          //only running prep
          awaits = [handlePrep(options.verbose)];
        }
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
      return await Promise.all(awaits);
    });

  program
    .command("start")
    .description(
      "Starts local deploy for debugging purposes. To start only the front end (no databases), see the manual.",
    )
    .option("--no-cache", "Rebuild all images from scratch, without using the cache.")
    .option("-v, --verbose", "output extra debugging info")
    .action(async (options) => {
      if (options.verbose) console.log("Starting start...");
      moveToProjectRoot();
      if (options.verbose) console.log("Copying experiments.js to front-end");
      try {
        fs.copyFileSync("pushkin/front-end/src/experiments.js", "pushkin/front-end/experiments.js");
      } catch (e) {
        console.error(
          e,
          "Couldn't copy experiments.js. Make sure it exists and is in the right place.",
        );
        process.exit(1);
      }

      if (!options.cache) {
        // options.cache===true by default because of --no-cache flag
        try {
          console.log("Rebuilding Docker images");
          await compose.buildAll({
            cwd: path.join(process.cwd(), "pushkin"),
            config: "docker-compose.dev.yml",
            log: options.verbose,
            commandOptions: ["--no-cache"],
          });
        } catch (e) {
          console.error("Problem rebuilding Docker images:");
          throw e;
        }
      }

      if (options.verbose) console.log(`Running docker-compose up...`);
      const composeUpOptions =
        options.cache ? ["--build", "--remove-orphans"] : ["--remove-orphans"];
      try {
        await compose.upAll({
          cwd: path.join(process.cwd(), "pushkin"),
          config: "docker-compose.dev.yml",
          log: options.verbose,
          commandOptions: composeUpOptions,
        });
        console.log("Starting. You may not be able to load localhost for a minute or two.");
      } catch (e) {
        console.error("Something went wrong:");
        throw e;
      }
    });

  program
    .command("stop")
    .description(
      "Stops the local deploy. This will not remove the local docker images. To do that, see documentation for pushkin kill and pushkin armageddon.",
    )
    .action(() => {
      moveToProjectRoot();
      compose
        .stop({
          cwd: path.join(process.cwd(), "pushkin"),
          config: "docker-compose.dev.yml",
        })
        .then(
          (out) => {
            console.log(out.out, "done");
          },
          (err) => {
            console.log("something went wrong:", err);
          },
        );
      return;
    });

  program
    .command("kill")
    .description(
      "Removes all containers and volumes from local Docker, as well as pushkin-specific images. To additionally remove third-party images, run `pushkin armageddon`.",
    )
    .action(killLocal);

  program
    .command("armageddon")
    .description(
      "Complete reset of the local docker. This will generate some error messages, which you can safely ignore. WARNING This will NOT discriminate between Pushkin-related Docker images and other Docker images you may be using.",
    )
    .action(async () => {
      console.log(`Deleting all local docker images, including those not related to Pushkin...`);
      try {
        await exec(
          "docker stop $(docker ps -aq); docker rm $(docker ps -aq); docker network prune -f; docker rmi -f $(docker images --filter dangling=true -qa); docker volume rm $(docker volume ls --filter dangling=true -q); docker rmi -f $(docker images -qa)",
        );
      } catch (err) {
        console.err(err);
      }
      console.log(`Now running docker system prune. This will take a while...`);
      try {
        await exec("docker system prune -af)");
      } catch (err) {
        console.err(err);
      }
      return;
    });

  program
    .command("config [what]")
    .description(
      "View config file for `what`, with possible values being `site` or any of the installed experiments by name. Defaults to all.",
    )
    .action((what) => {
      handleViewConfig(what);
    });

  program
    .command("utils <cmd>")
    .description(
      `Functions that are useful for backwards compatibility or debugging.\n
      updateDB: Updates test database. This is automatically run as part of 'pushkin prep'.\n
      setup-transaction-db: Creates a local transactions db. Useful for users of old site templates who wish to use CLI v2+.\n
      aws-auto-scale: Setups up default autoscaling for an AWS deploy. Normally run as part of 'aws init'.\n
      zip: Useful for publishing new templates. Zips up current directory, recursively ignoring .git and node_modules.`,
    )
    .action(async (cmd) => {
      switch (cmd) {
        case "updateDB":
          moveToProjectRoot();
          try {
            await handleUpdateDB();
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        case "setup-transaction-db":
          moveToProjectRoot();
          try {
            await setupTestTransactionsDB();
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        case "zip":
          try {
            execSync(`zip -r Archive.zip . -x "*node_modules*" -x "*.git*" -x "*.DS_Store"`);
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        case "aws-auto-scale":
          moveToProjectRoot();
          try {
            await handleCreateAutoScale();
          } catch (e) {
            console.error(e);
            process.exit();
          }
          break;
        default:
          console.error("Command not recognized. For help, run 'pushkin help utils'.");
      }
    });

  program.parseAsync(process.argv);
}

main();
