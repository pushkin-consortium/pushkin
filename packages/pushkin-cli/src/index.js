#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import jsYaml from 'js-yaml';
import fs from 'graceful-fs';
import path from 'path';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { execSync, exec } from 'child_process'; // eslint-disable-line
// subcommands
import { setupPushkinExp, getJsPsychTimeline, getJsPsychPlugins, getJsPsychImports, deleteExperiment, removeExpWorkers, archiveExperiment } from './commands/experiments/index.js';
import { initSite, setupPushkinSite } from './commands/sites/index.js';
import { awsInit, nameProject, addIAM, awsArmageddon, awsList, createAutoScale } from './commands/aws/index.js'
//import prep from './commands/prep/index.js'; //has to be separate from other imports from prep/index.js; this is the default export
import {prep, setEnv} from './commands/prep/index.js';
import { setupdb, setupTestTransactionsDB } from './commands/setupdb/index.js';
import * as compose from 'docker-compose'
import { Command } from 'commander'
import inquirer from 'inquirer'
import got from 'got';
const shell = require('shelljs');
import pacMan from './pMan.js';  //which package manager is available?

const version = require("../package.json").version

const program = new Command();
program.version(version);

const moveToProjectRoot = () => {
  // better checking to make sure this is indeed a pushkin project would be goodf
  while (process.cwd() != path.parse(process.cwd()).root) {
    if (fs.existsSync(path.join(process.cwd(), 'pushkin.yaml'))) return;
    process.chdir('..');
  }
  console.error('No pushkin project found here or in any above directories');
  process.exit();
};

const loadConfig = (configFile) => {
  // could add some validation to make sure everything expected in the config is there
  return new Promise((resolve, reject) => {
    try { 
      resolve(jsYaml.safeLoad(fs.readFileSync(configFile, 'utf8')));
    } catch (e) { 
      console.error(`Pushkin config file missing, error: ${e}`); 
      process.exit(1); 
    }
  })
};

const updateS3 = async () => {
  let awsName, useIAM
  try {
    let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsName = awsResources.awsName
    useIAM = awsResources.iam
  } catch (e) {
    console.error(`Unable to read deployment config`)
    throw e
  }    

  let syncMe
  try {
    return syncS3(awsName, useIAM)
  } catch(e) {
    console.error(`Unable to sync local build with s3 bucket`)
    throw e
  }  
}

const dockerLogin = async () => {
  //get dockerhub id
  let DHID
  try {
    let config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'))
    DHID = config.DockerHubID
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`)
    throw e
  }

  if (DHID == '') {
    throw new Error(`Your DockerHub ID has disappeared from pushkin.yaml.\n I am not sure how that happened.\n
      If you run '$ pushkin setDockerHub' and then retry aws update, it might work. Depending on exactly why your DockerHub ID wasn't in pushkin.yaml.`)
  }

  try {
    console.log(`Confirming docker login.`)
    execSync(`cat .docker | docker login --username ${DHID} --password-stdin`)
  } catch (e) {
    console.error(`Automatic login to DockerHub failed. This might be because your ID or password are wrong.\n
      Try running '$ pushkin setDockerHub' and reset then try again.\n
      If that still fails, report an issue to Pushkin on GitHub. In the meantime, you can probably login manually\n
      by typing '$ docker login' into the console.\n Provide your username and password when asked.\n
      Then try '$ pushkin aws update' again.`)
    process.exit()
  }

  return(DHID)
}

const updateDocker = async () => {

  let DHID = await dockerLogin();

  try {
    return publishToDocker(DHID);
  } catch(e) {
    console.error('Unable to publish images to DockerHub')
    throw e
  }
}

const updateMigrations = async () => {
  let experimentsDir, productionDBs
  try {
    let config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'))
    experimentsDir = config.experimentsDir
    productionDBs = config.productionDBs
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`)
    throw e
  }
  console.log(`Handling migrations`)
  let ranMigrations, dbsToExps
  try {
    dbsToExps = await getMigrations(path.join(process.cwd(), experimentsDir), true)
  } catch (e) {
    console.error(`Unable to run database migrations`)
    throw e
  } 
  try {
    ranMigrations = runMigrations(dbsToExps, productionDBs)
  } catch (e) {
    console.error(`Unable to run database migrations`)
    throw e
  }
  return ranMigrations
}

const updateECS = async () => { //FUBAR needs way of getting useIAM
  console.log(`Updating ECS services.`)

  let ECSName
  try {
    let config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'))
    ECSName = config.ECSName
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`)
    throw e
  }

  const yamls = fs.readdirSync(path.join(process.cwd(), 'ECSTasks'));
  return Promise.all(
    yamls.forEach((yaml) => {
      if (yaml != "ecs-params.yml"){
        let composeCommand = `ecs-cli compose -f ${yaml} -p ${yaml.split('.')[0]} service up --ecs-profile ${useIAM} --cluster-config ${ECSName} --force-deployment`
        try {
         temp = exec(composeCommand, { cwd: path.join(process.cwd(), "ECStasks")})
        } catch(e) {
          console.warn('\x1b[31m%s\x1b[0m', `Unable to update service ${yaml}.`)
          console.warn('\x1b[31m%s\x1b[0m', e)
        }          
      }
    })
  )
}

const handleAWSUpdate = async () => {

  console.log(`Loading deployment config`)

  let publishedToDocker
  try {
    publishedToDocker = updateDocker();
  } catch(e) {
    throw e
  }

  let syncMe
  try {
    syncMe = updateS3()
  } catch(e) {
    throw e
  }

  let ranMigrations
  try {
    ranMigrations = updateMigrations()
  } catch (e) {
    throw e
  }    

  await Promise.all([ publishedToDocker, syncMe, ranMigrations ]) 
  //Technically only publishedToDocker needs to finish before we update ECS
  //But waiting for everything increases that likelihood

 let compose
  try {
    compose = updateECS()
  } catch (e) {
    throw e
  }

  return compose // this is a promise, so can be awaited
}

const handleCreateAutoScale = async () => {
  let projName
  try {
    let temp = loadConfig(path.join(process.cwd(), 'pushkin.yaml'))  
    projName = temp.info.projName.replace(/[^A-Za-z0-9]/g, "")
  } catch (e) {
    console.error(`Unable to find project name`)
    throw e
  }

  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    throw e
  }

  return createAutoScale(useIAM.iam, projName)
}

const handleViewConfig = async (what) => {
  moveToProjectRoot();
  let x = await ((what=='site' | !what) ? loadConfig(path.join(process.cwd(), 'pushkin.yaml')) : '')
  let exps = fs.readdirSync(path.join(process.cwd(), 'experiments'));
  let y = await Promise.all(exps.map(async (exp) => {
    return await (what == exp | !what) ? loadConfig(path.join(process.cwd(), 'experiments', exp, 'config.yaml')) : '';
  }));
  //Thanks to https://stackoverflow.com/questions/49627044/javascript-how-to-await-multiple-promises
}

const handleUpdateDB = async (verbose) => {
  if (verbose) console.log('--verbose flag set inside handleUpdateDB()');
  moveToProjectRoot();
  let settingUpDB, config;
  try {
     config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
  } catch (err) {
    console.log('Could not load pushkin.yaml');
    throw err;
  }

  try {
    settingUpDB = await setupdb(config.databases, path.join(process.cwd(), config.experimentsDir), verbose);
  } catch (err) {
    console.error(err);
    process.exit();
  }
  return settingUpDB;
}

// For removing any .DS_Store files if present.
const removeDS = (verbose) => {
  if (verbose) {
    console.log('--verbose flag set inside removeDS()');
    console.log('Removing any .DS_Store files, if present.');
  }
  shell.rm('-rf', '*/.DS_Store');
  shell.rm('-rf', './.DS_Store');
}

const handlePrep = async (verbose) => {
  if (verbose) console.log('--verbose flag set inside handlePrep()');
  moveToProjectRoot();
  const config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
  let out;
  if (verbose) {
    console.log(path.join(process.cwd(), config.experimentsDir));
    console.log(path.join(process.cwd(), config.coreDir));
  }
  try {
    out = await prep(
      path.join(process.cwd(), config.experimentsDir),
      path.join(process.cwd(), config.coreDir),
      verbose
    );
  } catch (err) {
    console.error(err);
    process.exit();
  }
  return;  
}

const handleAWSList = async () => {
  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  return awsList(useIAM.iam)
}

const handleAWSKill = async () => {
  let nukeMe
  try {
    nukeMe = await inquirer.prompt([{ type: 'input', name: 'kill', message: `This command will DELETE your website.\n This cannot be undone.\n Are you SURE you want to do this?\n Confirm by typing 'kill my website'.`}])
  } catch (e) {
    console.error('Problem getting permission.\n', e)
    process.exit()
  }
  if (nukeMe.kill != 'kill my website') {
    console.log('That is probably wise. Exiting.')
    return
  }
  let nukeMeTwice
  try {
    nukeMeTwice = await inquirer.prompt([{ type: 'input', name: 'kill', message: `Your database -- along with any data -- will be deleted.\n Confirm this is what you want by typing 'kill my data'.`}])
  } catch (e) {
    console.error('Problem getting permission.\n', e)
    process.exit()
  }
  if (nukeMeTwice.kill != 'kill my data') {
    console.log('That is probably wise. Exiting.')
    return
  }
  console.log(`I hope you know what you are doing. This makes me nervous every time...`)
  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  return awsArmageddon(useIAM.iam, 'kill')
}

const handleAWSArmageddon = async () => {
  let nukeMe
  try {
    nukeMe = await inquirer.prompt([{ type: 'input', name: 'armageddon', message: `This command will delete more or less EVERYTHING on your AWS account.\n This cannot be undone.\n Are you SURE you want to do this?\n Confirm by typing 'armageddon'.`}])
  } catch (e) {
    console.error('Problem getting permission.\n', e)
    process.exit()
  }
  if (nukeMe.armageddon != 'armageddon') {
    console.log('That is probably wise. Exiting.')
    return
  }
  let nukeMeTwice
  try {
    nukeMeTwice = await inquirer.prompt([{ type: 'input', name: 'armageddon', message: `Your database -- along with any data -- will be deleted.\n Confirm this is what you want by typing 'nuke my data'.`}])
  } catch (e) {
    console.error('Problem getting permission.\n', e)
    process.exit()
  }
  if (nukeMeTwice.armageddon != 'nuke my data') {
    console.log('That is probably wise. Exiting.')
    return
  }
  console.log(`I hope you know what you are doing. This makes me nervous every time...`)
  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  return awsArmageddon(useIAM.iam, 'armageddon')
}

/**
 * Fetches all templates of a given type under a given scope from npm.
 * @param {string} scope Currently, this can only be 'pushkin-templates' (note the lack of "@").
 * @param {string} templateType Currently, this can only be 'site' or 'experiment'.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {Array<string>} An array of template names.
 */
const getTemplates = async (scope, templateType, verbose) => {
  let response
  let body
  let templates = []
  if (verbose) console.log('--verbose flag set inside getTemplates()')
  if (verbose) console.log(`Fetching available ${templateType} templates`)
  try {
    // Search with npm API for all packages under given scope (250 is max number of results; 20 is default limit)
    response = await got(`https://registry.npmjs.org/-/v1/search?text=scope:${scope}&size=250`); // Allowing for flexibility in scope, in case we ever do a pushkin-contrib scope or similar
    body = JSON.parse(response.body);
    body.objects.forEach((searchResult) => {
      let template = searchResult.package.name
      // If a template package matches the given scope and template type, add it to the list
      // Note for exp templates, templateType will be "experiment", but the package name will start with "@pushkin/template-exp-"
      if (template.startsWith(`@${scope}/${templateType === 'experiment' ? 'exp' : templateType}`))
      templates.push(template);
    });
    templates.sort();
  } catch (error) {
    console.error(`Problem fetching available ${templateType} templates`);
    process.exit(1);
  }
  return templates;
}

/**
 * Fetches all versions of a given template package from npm.
 * @param {string} packageName The name of the template package.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {Object} An object containing the package name, a list of available versions, and the latest version.
 */
const getVersions = async (packageName, verbose) => {
  let response
  let body
  let versions = new Object();
  if (verbose) console.log('--verbose flag set inside getVersions()')
  if (verbose) console.log(`Fetching available versions of ${packageName}`)
  try {
    response = await got(`https://registry.npmjs.org/${packageName}`);
    body = JSON.parse(response.body);
    // Extract version info and add to the versions object
    versions.name = body.name // should equal packageName, but trying not to put user input into execSync()
    versions.versionList = Object.keys(body.versions).reverse() // reverse the list so most recent versions are first
    versions.latest = body['dist-tags'].latest
  } catch (error) {
    console.error(`Problem fetching available versions of ${packageName}`);
    process.exit(1);
  }
  return versions;
}

/**
 * The primary function for installing site and experiment templates.
 * @param {string} templateType "site" or "experiment".
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 */
const handleInstall = async (templateType, verbose) => {
  if (verbose) console.log('--verbose flag set inside handleInstall()');
  try {
    /* The first major section of handleInstall() is substantially similar for site and exp templates.
    The main goals are to determine which template the user wants, install it as a dependency of their site,
    and copy the template files into the relevant directory.
    The second major section of handleInstall() is different for site and exp templates,
    since what we do with the template files differs between sites and experiments. */
    
    let templateName;
    let templateVersion;
    let longName; // Only for experiments
    let shortName; // Only for experiments
    let config; // Only for experiments
    let newExpJs; // Only for import of jsPsych experiment.html with basic exp template

    if (templateType === "site") {
      // Make sure the directory is empty prior to the site install
      if (fs.readdirSync(process.cwd()).length > 0) {
        const emptyDirPrompt = await inquirer.prompt([
          { type: 'list',
            name: 'yesImSure',
            choices: [
              { name: "Yes, I'm sure.", value: true },
              { name: "No, I'll make a new directory and try again.", value: false}
            ],
            default: 1,
            message: "The current directory already has some contents. Are you sure you want to install your site here?"
          }
        ]);
        if (!emptyDirPrompt.yesImSure) {
          process.exit(1);
        }
      }
    } else { // templateType === "experiment"}
      // Make sure we're in the root of the site directory
      moveToProjectRoot();
      // Ask the user for the name of their experiment
      config = await loadConfig('pushkin.yaml');
      const expNamePrompt = await inquirer.prompt([
        { type: 'input',
          name: 'expName',
          message: "What do you want to call your experiment?"
        }
      ]);
      longName = expNamePrompt.expName;
      // Make sure the experiment name begins with a letter
      if (!/^[a-zA-z]/.test(longName)) {
        console.error('Experiment names must begin with a letter. Please choose a different name.');
        process.exit(1);
      }
      // Create a short name for the experiment
      // Remove any character that's not alphanumeric, underscore, or whitespace
      // Then replace any whitespace with underscores
      shortName = longName.replace(/[^\w\s]/g, "").replace(/\s/g, "_");
      // Check that the experiment name is not already in use
      if (fs.existsSync(path.join(process.cwd(), config.experimentsDir, shortName))) {
        console.error('An experiment with this name already exists. Please choose a different name.');
        process.exit(1);
      }
    }
    // Ask the user where they want to get their template from
    const templateSourcePrompt = await inquirer.prompt([
      { type: 'list',
        name: 'templateSource',
        choices: [
          { name: "Official Pushkin distribution (@pushkin-templates)", value: 'pushkin', short: "@pushkin-templates"},
          { name: "Elsewhere on npm", value: 'npm', short: "npm"},
          { name: "Local path", value: 'path', short: "path" }
        ],
        default: 0,
        message: `Where do you want to look for ${templateType} templates?`
      }
    ]);
    const templateSource = templateSourcePrompt.templateSource;
    
    if (templateSource === "path") {
      // Ask the user for the path to their template
      const templatePathPrompt = await inquirer.prompt([
        { type: 'input',
          name: 'templatePath',
          message: `What is the absolute path to your ${templateType} template?`
        }
      ]);
      const templatePath = templatePathPrompt.templatePath;
      // Check that the path exists
      if (!fs.existsSync(templatePath)) {
        console.error('That path does not exist. Please try again!');
        process.exit(1);
      }
      // Extract the package.json and check that it has the necessary build script
      let packageJson;
      try {
        packageJson = JSON.parse(fs.readFileSync(path.join(templatePath,'package.json'), 'utf8'));
        if (!packageJson.scripts.build || !packageJson.scripts.build.includes('build/template.zip')) {
          console.error(`The ${templateType} template package must have a build script that zips the template files into build/template.zip`);
          process.exit(1);
        }
      } catch (e) {
        console.error('Could not parse template package.json');
        throw e;
      }
      templateName = packageJson.name;
      templateVersion = packageJson.version;
      // Make sure the package has been built
      if (verbose) console.log(`Building the ${templateType} template package`);
      execSync(`${pacMan} build`, { cwd: templatePath });
      // Locally publish the template package
      if (verbose) console.log(`Locally publishing the ${templateType} template package`);
      execSync('yalc publish', { cwd: templatePath });

    } else { // templateSource === "npm" || templateSource === "pushkin"
      
      if (templateSource === "pushkin") {
        // If the user wants an official Pushkin template, fetch a list of available ones
        const templateNames = await getTemplates('pushkin-templates', templateType, verbose);
        // Ask the user which template they want to use
        const templateNamePrompt = await inquirer.prompt([
          { type: 'list',
            name: 'templateName',
            choices: templateNames,
            message: `Which ${templateType} template would you like to use?`
          }
        ]);
        templateName = templateNamePrompt.templateName;
      
      } else { // templateSource === "npm"
        // Ask the user for the npm package for their template
        const npmTemplateNamePrompt = await inquirer.prompt([
          { type: 'input',
            name: 'npmTemplateName',
            message: "What is the name of the npm package?"
          }
        ]);
        templateName = npmTemplateNamePrompt.npmTemplateName;
      }

      // Fetch available versions of the template package
      const templateVersions = await getVersions(templateName, verbose);
      // Ask the user which version they want to use
      const templateVersionPrompt = await inquirer.prompt([
        { type: 'list',
          name: 'templateVersion',
          choices: templateVersions.versionList,
          default: templateVersions.latest,
          // If the user is using an official Pushkin site template, recommend the latest version
          message: `Which version would you like to use?${templateSource === "pushkin" ? ` (Recommended: ${templateVersions.latest})` : ''}`
        }
      ]);
      templateVersion = templateVersionPrompt.templateVersion;
    }

    // If the user is installing a site template, initialize the user's site directory as a private package
    if (templateType === "site") {
      await initSite(verbose);
    }

    // If the user is installing the basic experiment template, ask if they want to import a jsPsych experiment.html
    if (templateType === "experiment" && templateName === '@pushkin-templates/exp-basic') {
      const importExpPrompt = await inquirer.prompt([
        { type: 'confirm',
          name: 'importExp',
          default: false,
          message: "Would you like to import a jsPsych experiment.html?"
        }
      ]);
      const importExp = importExpPrompt.importExp;
      if (importExp) {
        const expHtmlPathPrompt = await inquirer.prompt([
          { type: 'input',
            name: 'expHtmlPath',
            message: "What is the absolute path to your experiment.html?"
          }
        ]);
        const expHtmlPath = expHtmlPathPrompt.expHtmlPath;
        if (!expHtmlPath) {
          console.log("No path provided to jsPsych experiment; installing the basic template as is.");
        } else if (!fs.existsSync(expHtmlPath) || !fs.lstatSync(expHtmlPath).isFile()) {
          console.error("Invalid file path to jsPsych experiment; please try again.");
          process.exit(1);
        } else { // If the path looks valid, try to import the jsPsych experiment.html
          const expHtmlPlugins = getJsPsychPlugins(expHtmlPath, verbose);
          // If you wanted to add a feature to ask the user if there are additional plugins they want,
          // here would probably be the place to implement it.
          const expHtmlImports = getJsPsychImports(expHtmlPlugins, verbose);
          const expHtmlTimeline = getJsPsychTimeline(expHtmlPath, verbose);
          if (expHtmlImports && expHtmlTimeline) {
            // Create the necessary import statements from the object of jsPsych plugins
            let imports = '';
            Object.keys(expHtmlImports).forEach((plugin) => {
              // Check if plugin specifies version (i.e. 'Is there another "@" after initial one?')
              if (plugin.slice(1).includes('@')) {
                let pluginNoVersion = '@' + plugin.split('@')[1] // [1] will be the plugin name, add back leading '@'
                let pluginVersion = plugin.split('@')[2] // [2] will be the version number
                // Add version info as a comment after the import statement (to be read by prep later)
                imports = imports.concat(`import ${expHtmlImports[plugin]} from '${pluginNoVersion}'; // version:${pluginVersion} //\n`);
              } else {
                imports = imports.concat(`import ${expHtmlImports[plugin]} from '${plugin}';\n`);
              }
            });
            newExpJs = `${imports}\nexport function createTimeline(jsPsych) {\n${expHtmlTimeline}\nreturn timeline;\n}\n`;
          } else {
            const importErrorPrompt = await inquirer.prompt([
              { type: 'confirm',
                name: 'installBasic',
                default: false,
                message: "There was a problem importing your experiment.html. Would you like to install the basic template as is?"
              }
            ]);
            if (!importErrorPrompt.installBasic) {
              process.exit(1);
            }
          }
        }
      }
    }

    // Add and install the package (this should work even for repeat installs of the same exp template)
    if (verbose) console.log(`Installing the ${templateType} template package`);
    try {
      execSync(`${ templateSource === 'path' ? 'yalc' : pacMan } add ${templateName}@${templateVersion} --dev && ${pacMan} install`);
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
        // If so, unzip it
        execSync(`unzip node_modules/${templateName}/build/template.zip ${ templateType === 'experiment' ? `-d ${path.join(config.experimentsDir, shortName)}` : '' }`);
      } else {
        // Otherwise, wait 5 seconds and try to unzip it
        await new Promise(resolve => setTimeout(resolve, 5000));
        execSync(`unzip node_modules/${templateName}/build/template.zip ${ templateType === 'experiment' ? `-d ${path.join(config.experimentsDir, shortName)}` : '' }`);
      }
    } catch (e) {
      console.error(`Problem unzipping ${templateType} template files`);
      throw e;
    }
    
    // At this point, the behavior of handleInstall() diverges significantly for site and experiment templates
    if (templateType === "site") {
      // Set up the template files
      if (verbose) console.log('Setting up site template files');
      await setupPushkinSite(verbose);
      if (verbose) console.log('Finished setting up site template files');
      // Set up the transactions database
      if (verbose) console.log("setting up transactions db");
      await setupTestTransactionsDB(verbose) // Not distributed with sites since it's the same for all of them.
    
    } else { // templateType === "experiment"
      if (verbose) console.log('Setting up experiment template files');
      await setupPushkinExp(longName, shortName, path.join(config.experimentsDir, shortName), process.cwd(), verbose);
      // Overwrite experiment.js with the imported jsPsych experiment if desired
      if (newExpJs) {
        if (verbose) console.log(`Writing new experiment.js file`);
        fs.writeFileSync(path.join(process.cwd(), config.experimentsDir, shortName, 'web page/src/experiment.js'), newExpJs);
      }
    }
  } catch(e) {
    throw e;
  }
}

const handleAWSInit = async (force) => {

 let DHID
 try {
   DHID = await dockerLogin(); 
 } catch (error) {
   console.log(error);
   process.exit();
 }

 let config
  try {
    config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'))
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`)
    throw e
  }

  let projName, useIAM, awsName, stdOut

  try {
    execSync('aws --version')
  } catch(e) {
    console.error('Please install the AWS CLI before continuing.')
    process.exit();
  }

  let newProj = true
  if (config.info.projName) {
    let myChoices = (config.info.projName ? [config.info.projName, 'new'] : ['new'])
    try {
      projName = await inquirer.prompt([ { type: 'list', name: 'name', choices: myChoices, message: 'Which project?'}])
    } catch (e) {
      throw e
    }
    if (projName.name != "new") {
      newProj = false;
      awsName = config.info.awsName
    }
    if (force) {
      try {
        //Run this anyway to reset awsResources.js and remove productionDBs from pushkin.yaml
        awsName = await nameProject(projName.name)
      } catch (e) {
        throw e
      }
    }
  }

  if (newProj) {
    try {
      projName = await inquirer.prompt([ { type: 'input', name: 'name', message: 'Name your project'}])
    } catch(e) {
      console.error(e)
      process.exit()
    }
    try {
        awsName = await nameProject(projName.name)    
    } catch (e) {
      throw e
    }
  }


  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  try {
    stdOut = execSync(`aws configure list --profile ${useIAM.iam}`).toString()
  } catch (e) {
    console.error(`The IAM user ${useIAM.iam} is not configured on the AWS CLI. For more information see https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html`)
    process.exit();
  }
  let addedIAM
  try {
    addedIAM = addIAM(useIAM.iam) //this doesn't need to be synchronous      
  } catch(e) {
    console.error(e)
    process.exit()
  }
  try {
    await Promise.all([awsInit(projName.name, awsName, useIAM.iam, config.DockerHubID), addedIAM])
  } catch(e) {
    throw e
  }
  console.log("finished aws init")

  return
}

const killLocal = async () => {
  console.log('Removing all containers and volumes, as well as pushkin images. To additionally remove third-party images, run `pushkin armageddon`.') 
  moveToProjectRoot();
  try {
    await compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
  } catch (err) {
    console.error('Problem with stopping docker: ', err)
    process.exit();
  }
  try {
    await compose.rm({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
  } catch (err) {
    console.error('Problem with removing docker containers: ', err)
    process.exit();
  }
  try {
    await exec(`docker volume rm pushkin_test_db_volume pushkin_message_queue_volume; docker images -a | grep "_worker" | awk '{print $3}' | xargs docker rmi -f`)    
    await exec(`docker rmi -f api`)
    await exec(`docker rmi -f server`)
  } catch (err) {
    console.error('Problem with removing volumes and images docker: ', err)
    process.exit();
  }
  console.log('Completed kill')
  return;  
}

const handleRemove = async (experiments, mode, force, verbose) => {
  if (verbose) console.log('--verbose flag set inside handleRemove()');
  // Make sure we're in the root of the site directory
  moveToProjectRoot();
  // Load the pushkin.yaml file
  const config = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'pushkin.yaml')));
  // Get the path to the experiments directory
  const expDir = path.join(process.cwd(), config.experimentsDir);
  // Check that the experiments directory exists\
  if (!fs.existsSync(expDir)) {
    console.error(`Experiments folder (${expDir}) not found.`);
    process.exit(1);
  }
  const expsToRemove = [];
  // Check that all specified experiments exist
  if (experiments && experiments.length > 0) {
    experiments.forEach(exp => {
      if (!fs.existsSync(path.join(expDir, exp))) {
        console.error(`Experiment ${exp} not found.`);
        process.exit(1);
      }
    });
    expsToRemove.push(...experiments);
  } else { // If no experiments were specified, ask which ones the user wants to remove
    const expList = fs.readdirSync(expDir)//.filter(file => fs.statSync(path.join(expDir, file)).isDirectory());
    const expPrompt = await inquirer.prompt([
      { type: 'checkbox',
        name: 'expsToRemove',
        message: 'Select one or more experiments to remove:',
        choices: expList
      }
    ]);
    expsToRemove.push(...expPrompt.expsToRemove);
  }
  // Exit if no experiments were selected
  if (expsToRemove.length === 0) {
    console.log('No experiments were selected for removal.');
    process.exit();
  }

  // If the mode was not specified, ask the user whether they want to delete, archive, or unarchive the experiment(s)
  let removeMode
  if (mode) {
    removeMode = mode;
  } else {
    const modePrompt = await inquirer.prompt([
      { type: 'list',
        name: 'mode',
        message: 'Would you like to delete, archive, or unarchive the experiment(s)?',
        choices: ['Delete', 'Archive', 'Unarchive']
      }
    ]);
    removeMode = modePrompt.mode.toLowerCase();
  }

  // If the mode is delete, ask the user for confirmation
  if (removeMode === 'delete' && !force) {
    const confirmPrompt = await inquirer.prompt([
      { type: 'confirm',
        name: 'confirmDelete',
        default: false,
        message: `This action will permanently delete the following experiments:\n - ${expsToRemove.join('\n - ')}\nThis action cannot be undone. Are you sure you want to proceed?`
      }
    ]);
    if (!confirmPrompt.confirmDelete) {
      console.log('No experiments were deleted.');
      process.exit();
    }
  }

  try {
    let removedExps
    const expPaths = expsToRemove.map(exp => path.join(expDir, exp));
    if (removeMode === 'delete') {
      // Kill all Pushkin Docker containers and images
      killLocal();
      if (verbose) console.log('Deleting experiment(s)...')
      // deleteExperiment() returns a promise for each deleted experiment
      removedExps = expPaths.map(expPath => deleteExperiment(expPath, verbose));
      // Add another promise to update the docker-compose file
      removedExps.push(removeExpWorkers(expsToRemove, verbose));
    
    } else if (removeMode === 'archive') {
      if (verbose) console.log('Archiving experiment(s)...')
      // Similarly create an array of promises using archiveExperiment()
      removedExps = expPaths.map(expPath => archiveExperiment(expPath, true, verbose));
    
    } else { // removeMode === 'unarchive'
      if (verbose) console.log('Unarchiving experiment(s)...')
      removedExps = expPaths.map(expPath => archiveExperiment(expPath, false, verbose));
    }
    
    await Promise.all(removedExps);
    console.log(`Experiment(s) sucessfully ${removeMode}d`);
  } catch (e) {
    console.error("Problem removing experiment(s)", e);
    throw e;
  }
};

async function main() {

  program
    .command('install')
    .alias('i')
    .argument('<what>', `Which type of template to install. Options are "site" or "experiment" (or "exp").`)
    .option('-v, --verbose', 'output extra debugging info')
    .description(`Install website ('site') or experiment template.`)
    .action((what, options) => {
      if (['site','experiment','exp'].includes(what)){
        let templateType;
        if (what === 'exp') {
          templateType = 'experiment';
        } else {
          templateType = what;
        }
        try {
          handleInstall(templateType, options.verbose);
        } catch(e) {
          console.error(e);
          process.exit();
        }
      } else {
        console.error(`Command not recognized. Run 'pushkin --help' for help.`);
      }
    });

  program
    .command('remove <what>')
    .alias('rm')
    .description(`Delete, archive, or unarchive a Pushkin experiment. Deletion permanently removes all the experiment's files and data; archiving simply removes the experiment from the front end.`)
    .option('-e, --experiments [experiments...]', 'Specify which experiment(s) to delete, archive, or unarchive')
    .option('-m, --mode [mode]', 'Specify whether to delete, archive, or unarchive the experiment(s)')
    .option('-f, --force', 'Suppresses confirmation prompt when deleting experiments')
    .option('-v, --verbose', 'Output extra debugging info')
    .action(async (what, options) => {
      // Check that `remove` argument is valid
      if (what === 'exp' || what === 'experiment') {
        // Check that mode is valid (if provided)
        if (options.mode && !['delete', 'archive', 'unarchive'].includes(options.mode)) {
          console.error('Invalid mode. Mode can only be "delete", "archive", or "unarchive".');
          process.exit(1);
        }
        try{
          await handleRemove(options.experiments, options.mode, options.force, options.verbose);
        } catch(e) {
          console.error("Problem removing experiment(s):", e);
          process.exit(1);
        }
      } else {
        console.error('Invalid argument. Currently, you can only remove "experiment" (or "exp").');
        process.exit(1);
      }
    });

  program
    .command('aws <cmd>')
    .description(`For working with AWS. Commands include:\n 
      init: initialize an AWS deployment.\n 
      update: update an AWS deployment.\n
      armageddon: delete AWS resources created by Pushkin.\n
      list: list AWS resources created by Pushkin (and possibly others).`)
    .option('-f, --force', 'Applies only to init. Resets installation options. Does not delete AWS resources (for that, use aws armageddon).', false)
    .option('-v, --verbose', 'output extra debugging info')
    .action(async (cmd, options) => {
      moveToProjectRoot();
      switch (cmd){
        case 'init':
          try {
            setEnv(false, options.verbose) // synchronous
            await handleAWSInit(options.force);
          } catch(e) {
            console.error(e)
            process.exit();
          }
          break;
        case 'update':
          try {
            //await handleAWSUpdate();
            console.warn('\x1b[31m%s\x1b[0m', `Not currently implemented. Sorry.`)
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        case 'armageddon':
          try {
            await handleAWSArmageddon();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        case 'list':
          try {
            await handleAWSList();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        default: 
          console.error("Command not recognized. For help, run 'pushkin help aws'.")
      }
    });

  program
    .command('setDockerHub')
    .description(`Set (or change) your DockerHub ID. This must be run before deploying to AWS.`)
    .action(() => {
      moveToProjectRoot();
      inquirer.prompt([
          { type: 'input', name: 'ID', message: 'What is your DockerHub ID?'}
        ]).then(async (answers) => {
          let config
          try {
            config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
          } catch(e) {
            console.error(e)
            process.exit();
          }
          config.DockerHubID = answers.ID;
          try {
            fs.writeFileSync(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(config))
          } catch (e) {
            console.error('Unable to rewrite pushkin.yaml.')
            console.error(e)
            process.exit()
          }
          inquirer.prompt([
            { type: 'input', name: 'pw', message: 'What is your DockerHub password?'}
          ]).then(async (answers) => {
            fs.writeFileSync('.docker', answers.pw, err => {
              if (err) {
                console.error(err);
              }
              // file written successfully
            });
          })
        })
    })

  program
    .command('prep')
    .description('Prepares local copy for local testing. This step includes running migrations, so be sure you have read the documentation on how that works.')
    .option('--no-migrations', 'Do not run migrations. Be sure database structure has not changed!')
    .option('-p, --production', 'Run with front-end env var `debug`=false. Do this before deploying to AWS.')
    .option('-v, --verbose', 'output extra debugging info')
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
        if (options.migrations) { // options.migrations===true by default because of --no-migrations flag
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
    })

  program
    .command('start')
    .description('Starts local deploy for debugging purposes. To start only the front end (no databases), see the manual.')
    .option('--no-cache', 'Rebuild all images from scratch, without using the cache.')
    .option('-v, --verbose', 'output extra debugging info')
    .action(async (options) => {
      if (options.verbose) console.log("Starting start...");
      moveToProjectRoot();
      if (options.verbose) console.log("Copying experiments.js to front-end");
      try {
        fs.copyFileSync('pushkin/front-end/src/experiments.js', 'pushkin/front-end/experiments.js');
      } catch (e) {
        console.error("Couldn't copy experiments.js. Make sure it exists and is in the right place.");
        process.exit(1);
      }

      if (!options.cache) { // options.cache===true by default because of --no-cache flag
        try {
          console.log("Rebuilding Docker images");
          await compose.buildAll({
            cwd: path.join(process.cwd(), 'pushkin'),
            config: 'docker-compose.dev.yml',
            log: options.verbose,
            commandOptions: ["--no-cache"]
          });
        } catch (e) {
          console.error("Problem rebuilding Docker images:");
          throw e;
        }
      }

      if (options.verbose) console.log(`Running docker-compose up...`);
      const composeUpOptions = options.cache ? ["--build", "--remove-orphans"] : ["--remove-orphans"];
      try {
        await compose.upAll({
          cwd: path.join(process.cwd(), 'pushkin'),
          config: 'docker-compose.dev.yml',
          log: options.verbose,
          commandOptions: composeUpOptions
        });
        console.log('Starting. You may not be able to load localhost for a minute or two.');
      } catch (e) {
        console.error("Something went wrong:");
        throw e;
      }
    });

  program
    .command('stop')
    .description('Stops the local deploy. This will not remove the local docker images. To do that, see documentation for pushkin kill and pushkin armageddon.')
    .action(() => {
      moveToProjectRoot();
      compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
        .then(
          out => { console.log(out.out, 'done')},
          err => { console.log('something went wrong:', err)}
        );
      return;
    });

  program
    .command('kill')
    .description('Removes all containers and volumes from local Docker, as well as pushkin-specific images. To additionally remove third-party images, run `pushkin armageddon`.')
    .action(killLocal);

  program
    .command('armageddon')
    .description('Complete reset of the local docker. This will generate some error messages, which you can safely ignore. WARNING This will NOT discriminate between Pushkin-related Docker images and other Docker images you may be using.')
    .action(async () => {
      console.log(`Deleting all local docker images, including those not related to Pushkin...`)
      try {
        await exec('docker stop $(docker ps -aq); docker rm $(docker ps -aq); docker network prune -f; docker rmi -f $(docker images --filter dangling=true -qa); docker volume rm $(docker volume ls --filter dangling=true -q); docker rmi -f $(docker images -qa)')
      } catch (err) {
        console.err(err);
      }
      console.log(`Now running docker system prune. This will take a while...`)
      try {
        await exec('docker system prune -af)')
      } catch (err) {
        console.err(err);
      }
     return;
    })

  program
    .command('config [what]')
    .description('View config file for `what`, with possible values being `site` or any of the installed experiments by name. Defaults to all.')
    .action((what) => {
      handleViewConfig(what)
    });


  program
    .command('utils <cmd>')
    .description(`Functions that are useful for backwards compatibility or debugging.\n
      updateDB: Updates test database. This is automatically run as part of 'pushkin prep'.\n
      setup-transaction-db: Creates a local transactions db. Useful for users of old site templates who wish to use CLI v2+.\n
      aws-auto-scale: Setups up default autoscaling for an AWS deploy. Normally run as part of 'aws init'.\n
      zip: Useful for publishing new templates. Zips up current directory, recursively ignoring .git and node_modules.`)
    .action(async (cmd) => {
      switch (cmd){
        case 'updateDB':
          moveToProjectRoot();
          try {
            await handleUpdateDB();
          } catch(e) {
            console.error(e)
            process.exit();
          }
          break;
        case 'setup-transaction-db':
          moveToProjectRoot();
          try {
            await setupTestTransactionsDB();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
          case 'zip':
            try {
              execSync(`zip -r Archive.zip . -x "*node_modules*" -x "*.git*" -x "*.DS_Store"`);
            } catch(e) {
              console.error(e);
              process.exit();
            }
            break;
          case 'aws-auto-scale':
            moveToProjectRoot();
            try {
            await handleCreateAutoScale();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        default: 
          console.error("Command not recognized. For help, run 'pushkin help utils'.")
        }
    })

  program.parseAsync(process.argv);
}

main();
