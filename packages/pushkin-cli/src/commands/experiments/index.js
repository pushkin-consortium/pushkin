import fs from 'graceful-fs';
import path from 'path';
import { promiseFolderInit } from '../sites/index.js'; //useful utility function
import { readConfig } from '../prep/index.js'; //useful utility function
import replace from 'replace-in-file';
import jsYaml from 'js-yaml';
import util from 'util';
const exec = util.promisify(require('child_process').exec);
const shell = require('shelljs');
import pacMan from '../../pMan.js'; //which package manager is available?

/**
 * Installs dependencies and builds the front-end and API packages for Pushkin sites (also used for experiment workers).
 * @param {string} expDir The directory for a particular experiment.
 * @param {string} expComponent The experiment component (e.g. "web page").
 * @param {string} packageName The name of the experiment component package (e.g. "<exp>_web").
 * @param {string} rootDir The root directory of the Pushkin site.
 * @param {string} buildPath The path to the site component to which the experiment component will be added (e.g. "pushkin/front-end").
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
*/
const promiseExpFolderInit = async (expDir, expComponent, packageName, rootDir, buildPath, verbose) => {
  //Similar to 'promiseFolderInit' in sites/index.js.
  //Modified to take advantage of yalc (not relevant for sites)
  if (verbose) console.log('--verbose flag set inside promiseExpFolderInit()');
  return new Promise ((resolve, reject) => {
    if (verbose) console.log(`Installing dependencies for ${packageName}`);
    try {
      exec(`${pacMan} --mutex network install`, { cwd: path.join(expDir, expComponent) })
        .then(() => {
          if (verbose) console.log(`Building ${packageName} from ${expComponent}`);
          exec(`${pacMan} --mutex network run build`, { cwd: path.join(expDir, expComponent) })
            .then(() => {
              if (verbose) console.log(`${packageName} is built`);
              exec('yalc publish', { cwd: path.join(expDir, expComponent) })
                .then(() => {
                  if (verbose) console.log(`${packageName} is published locally via yalc`);
                  exec(`yalc add ${packageName}`, { cwd: path.join(rootDir, buildPath) })
                    .then(() => {
                      if (verbose) console.log(`${packageName} added to build cycle via yalc`);                  
                      resolve(packageName)
                    })
                })
            })
      })
    } catch (e) {
      console.error(`Problem installing dependencies for ${packageName}`)
      throw(e)
    }
  })
};

/**
 * Performs setup tasks for a Pushkin experiment after template files have been copied into the experiment directory.
 * @param {string} longName The full name of the experiment (may include whitespace or special characters).
 * @param {string} shortName The shortened name of the experiment (only alphanumerics and underscores).
 * @param {string} expDir The directory for a particular experiment.
 * @param {string} rootDir The root directory of the Pushkin site.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
*/
export const setupPushkinExp = async (longName, shortName, expDir, rootDir, verbose) => {
  if (verbose) console.log('--verbose flag set inside setupPushkinExp()');
  // Perform some basic checks on the experiment template
  const requiredDirs = ['api controllers', 'migrations', 'web page', 'worker'];
  requiredDirs.forEach((dir) => {
    if (!fs.existsSync(path.join(expDir, dir))) {
      console.error(`Experiment template does not contain a ${dir} folder. Removing template files.`);
      shell.rm('-rf', expDir);
      process.exit(1);
    }
  });
  shell.rm('-rf', path.join(expDir, '__MACOSX'));
  // Rename migrations files replacing 'pushkintemplate' with the experiment's short name
  if (verbose) console.log(`Renaming migrations files`);
  const oldMigrations = fs.readdirSync(path.join(expDir, 'migrations'));
  const renamedMigrations = [];
  try {
    oldMigrations.forEach((file) => {
      if (file.match('pushkintemplate')) {
        const oldPath = path.join(expDir, 'migrations', file);
        let newFile = file.replace(/pushkintemplate/, shortName);
        // Remove the timestamp from the beginning of the file name
        //newFile = newFile.slice(newFile.indexOf('_') + 1); // Not sure why the knex timestamps were being removed before, but it doesn't seem necessary
        const newPath = path.join(expDir, 'migrations', newFile);
        renamedMigrations.push(fs.promises.rename(oldPath, newPath));
      }
    });
  } catch (e) {
    console.error("Failed to rename migrations files")
    throw e
  }
  // Replace 'pushkintemplate' in template files
  if (verbose) console.log(`Replacing "pushkintemplate" in experiment template files`);
  const options = {
    files: expDir.concat('/**/*.*'),
    from: /pushkintemplate/g,
    to: shortName,
  };
  try {
    await replace(options)
  }
  catch (error) {
    console.error(`Problem replacing "pushkintemplate":`, error);
  }
  // Now that 'pushkintemplate' occurrences are replaced, load config file
  let expConfig;
  try {
    expConfig = readConfig(expDir);
  } catch (err) {
    console.error(`Failed to read experiment config file for ${shortName}`);
    throw err;
  }
  // Allow the long name to be used in the config (before this it will be the same as the short name)
  expConfig.experimentName = longName;
  // Update exp config file with db password from main config
  const pushkinYaml = jsYaml.load(fs.readFileSync(path.join(rootDir, "pushkin.yaml")));
  expConfig.worker.service.environment.DB_PASS = pushkinYaml.databases.localtestdb.pass;

  try {
    fs.writeFileSync(path.join(expDir, 'config.yaml'), jsYaml.dump(expConfig), 'utf8');
  } catch (e) {
    console.error("Unable to update config.yaml");
    throw e
  }
  const apiPromise = promiseExpFolderInit(expDir, expConfig.apiControllers.location, `${shortName}_api`, rootDir, 'pushkin/api', verbose).catch((err) => { console.error(err); });
  const webPromise = promiseExpFolderInit(expDir, expConfig.webPage.location, `${shortName}_web`, rootDir, 'pushkin/front-end', verbose).catch((err) => { console.error(err); });
  // note that worker uses a different function, because it doesn't need yalc; it's published straight to Docker
  const workerPromise = promiseFolderInit(expDir, 'worker', verbose).catch((err) => { console.error(err); });

  // write out new compose file with worker service
  const composeFileLoc = path.join(path.join(rootDir, 'pushkin'), 'docker-compose.dev.yml');
  let compFile;
  try { 
    compFile = jsYaml.load(fs.readFileSync(composeFileLoc), 'utf8'); 
    if (verbose) console.log("Loaded main docker compose file");
  } catch (e) { 
    console.error("Failed to load main docker compose file: ", e);
    process.exit() 
  }
  await workerPromise //Need this to write docker-compose file

  const workerConfig = expConfig.worker;
  const workerService = workerConfig.service;
  const workerName = `${shortName}_worker`.toLowerCase(); //Docker names must all be lower case
  const workerLoc = path.join(expDir, workerConfig.location);
  const serviceContent = { ...workerService, image: workerName };
  serviceContent.labels = { ...(serviceContent.labels || {}), isPushkinWorker: true };
  compFile.services[workerName] = serviceContent;
  try {
    fs.writeFileSync(composeFileLoc, jsYaml.dump(compFile), 'utf8');
  } catch (e) { 
    console.error("Failed to create new compose file", e); 
    process.exit()
  }

  const contName = await apiPromise // Need this to write api controllers list

  // Handle API includes
  // Need to read in controllers.json and append a controller to it.
  let controllersJsonFile
  try {
    controllersJsonFile = JSON.parse(fs.readFileSync(path.join(rootDir, 'pushkin/api/src/controllers.json')))
  } catch(e) {
    console.error("Failed to load api/src/controllers.json");
    throw e
  }
  if (controllersJsonFile.hasOwnProperty(contName)){
    console.error("There is already an API controller named ", shortName)
    throw new Error("Problem adding API controller to controller list.")
  }
  controllersJsonFile[contName] = shortName;
  try {
   fs.writeFileSync(path.join(rootDir, 'pushkin/api/src/controllers.json'), JSON.stringify(controllersJsonFile), 'utf8')
  } catch (e) {
    console.error("Couldn't write controllers list");
    throw e
  }

  return await Promise.all(renamedMigrations.concat(webPromise))
};

/**
 * Extracts the timeline-creation procedure from a jsPsych experiment.
 * @param {string} experimentPath The path to the jsPsych experiment.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {string} The timeline-creation procedure from the declaration of the timeline up to the call to jsPsych.run().
 */
export function getJsPsychTimeline(experimentPath, verbose) {
  if (verbose) console.log('--verbose flag set inside getJsPsychTimeline()');
  // Read in entire experiment file as text
  let jsPsychExp = fs.readFileSync(experimentPath, 'utf8');
  // Extract timeline name by looking for the argument supplied to jsPsych.run()
  let jsPsychRunSearch = new RegExp(/(?<=jsPsych\.run\().+?(?=\))/, 'g');
  if (!jsPsychRunSearch.test(jsPsychExp)) {
    console.log('Could not find call to jsPsych.run in experiment.html');
    return;
  } else {
    if (verbose) console.log('Extracting timeline from experiment.html');
    let timelineName = jsPsychExp.match(jsPsychRunSearch)[0]; // [0] because match() returns an array
    // Look for where the timeline is declared
    let beginRegex = new RegExp(`(const|let|var) ${timelineName}`, 'gm');
    let timelineBegin = jsPsychExp.search(beginRegex);
    // Look for where jsPsych.run() is called
    let timelineEnd = jsPsychExp.search(/^\s*?jsPsych\.run/gm);
    // Return the extracted timeline procedure
    if (timelineBegin < 0 || timelineEnd < 0) { // If either search fails, return undefined
      console.log('Could not extract timeline from jsPsych experiment');
      return;
    } else {
      if (verbose) console.log('Timeline extracted from jsPsych experiment');
      return jsPsychExp.slice(timelineBegin, timelineEnd);
    }
  }
};

/**
 * Extracts the necessary plugins from a jsPsych experiment.
 * @param {string} experimentPath The path to the jsPsych experiment.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {Array} An array of plugins used in the experiment.
 */
export function getJsPsychPlugins(experimentPath, verbose) {
  if (verbose) console.log('--verbose flag set inside getJsPsychPlugins()');
  // Read in entire experiment file as text
  let jsPsychExp = fs.readFileSync(experimentPath, 'utf8');
  // Extract the names of the plugins used
  let plugins = jsPsychExp.match(/@jspsych.+?(?=['"])/g);
  // This should work for CDN links and import statements, but not for user-hosted plugins
  // That's probably a good thing, since
  // (a) it might be hard to tell what version of the plugin they're using
  // (b) if they've modified the plugin, it won't match what we import from npm
  if (!plugins) {
    console.log(`Could not extract any plugins from jsPsych experiment.
    Check your jsPsych experiment and make sure to import the necessary plugins in your Pushkin experiment.js`);
    return;
  } else {
    if (verbose) console.log('Found jsPsych packages:', '\n\t'.concat(plugins.join('\n\t')));
    return plugins;
  }
};

/**
 * Creates the necessary import statement for each jsPsych plugin for experiment.js.
 * @param {Array} plugins An array of plugins used in the experiment.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {string} The import statements for jsPsych plugins for experiment.js.
 */
export function getJsPsychImports(plugins, verbose) {
  if (verbose) console.log('--verbose flag set inside getJsPsychImports()');
  let imports = {};
  if (!plugins) return; // If no plugins were found by getJsPsychPlugins, return undefined
  plugins.forEach((plugin) => {
    // Plugin name formats to capture:
    // - @jspsych/plugin-some-name[@version] OR @jspsych-contrib/plugin-some-name[@version] --> jsPsychSomeName
    // - @jspsych/extension-some-name[@version] OR @jspsych-contrib/extension-some-name[@version] --> jsPsychExtensionSomeName
    // - @jspsych-timelines/some-name[@version] --> jsPsychTimelineSomeName
    let pluginName;
    let camelCase;
    // If the name includes "plugin-" or "extension-"
    if (plugin.search(/(plugin-|extension-)/) > -1) {
      // get an array of the words after "plugin-" or "extension-" (not including the version tag, if present)
      pluginName = plugin.match(/(?<=-)[a-z]+(?=(-|@|$))/g);
      // capitalize the first letter of each word and join them together
      camelCase = pluginName.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      if (plugin.includes('plugin-')) {
        // If it's a plugin, add "jsPsych" to the beginning
        imports[plugin] = 'jsPsych' + camelCase;
      } else {
        // Otherwise, it's an extension, so add "jsPsychExtension" to the beginning
        imports[plugin] = 'jsPsychExtension' + camelCase;
      }
    } else if (plugin.includes('@jspsych-timelines/')) {
      // Get an array of the words after the '/' (and potentially before the version tag)
      pluginName = plugin.split('@')[1].split('/')[1].split('-');
      // Capitalize the first letter of each word and join them together
      camelCase = pluginName.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      // Add "jsPsychTimeline" to the beginning
      imports[plugin] = 'jsPsychTimeline' + camelCase;
    } else {
      // If it's not a plugin or extension, warn the user and skip it
      console.log(`Problem adding "${plugin}" to imports.\nMake sure you import the plugins you need in experiment.js`);
    }
  });
  if (Object.keys(imports).length > 0) {
    if (verbose) console.log('New import statements for jsPsych packages created');
    return imports;
  } else {
    console.log('Problem creating import statements for jsPsych packages');
    return; // If no plugins were found, return undefined
  }
};

/**
 * Deletes an experiment's files from the experiments directory, as well as its timeline assets
 * @param {string} experimentPath The path to the experiment to be deleted
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 * @returns {Promise} A promise that resolves when the experiment's files are deleted
 */
export function deleteExperiment(experimentPath, verbose) {
  if (verbose) console.log('--verbose flag set inside deleteExperiment()');
  try {
    const experimentName = path.basename(experimentPath);
    if (verbose) console.log('Deleting experiment:', experimentName);
    // First delete the experiment directory
    const removedExpFiles = fs.promises.rm(experimentPath, { recursive: true, force: true });
    // Then delete the experiment's timeline assets
    const timelineAssetsPath = path.join(process.cwd(), 'pushkin/front-end/public/experiments', experimentName);
    const removedTimelineAssets = fs.promises.rm(timelineAssetsPath, { recursive: true, force: true });
    // Return a promise that resolves when both the experiment directory and timeline assets are deleted
    return Promise.all([removedExpFiles, removedTimelineAssets]);    
  } catch (e) {
    console.error('Error deleting experiment:', experimentName, e);
    throw(e);
  }
};

/**
 * Removes deleted experiments' workers from the site's docker-compose file 
 * @param {string[]} experiments The (short) names of the experiments to be removed
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 * @returns {Promise} A promise that resolves when the updated docker-compose file is written
 */
export function removeExpWorkers(experiments, verbose) {
  if (verbose) console.log('--verbose flag set inside removeExpWorkers()');
  try {
    if (verbose) console.log(`Removing deleted experiments' workers from docker-compose file`);
    const dockerComposePath = path.join(process.cwd(), 'pushkin/docker-compose.dev.yml');
    // Read in the docker-compose file
    const dockerCompose = jsYaml.load(fs.readFileSync(dockerComposePath, 'utf8'));
    experiments.forEach((exp) => {
      const workerName = exp.toLowerCase().concat('_worker');
      if (dockerCompose.services[workerName]) {
        // Delete the experiment's worker
        delete dockerCompose.services[workerName];
      } else {
        console.log(`Warning: no service found for ${workerName} in docker-compose.dev.yml. You might need to remove it manually.`);
      }
    });
    // Return the promise to write the updated docker-compose file
    return fs.promises.writeFile(dockerComposePath, jsYaml.dump(dockerCompose));
  } catch (e) {
    console.error("Error updating docker-compose file", e);
    throw e;
  }
};

/**
 * Updates an experiment's config file by adding/updating the specified key-value pair(s)
 * @param {string} experimentPath The path to the experiment
 * @param {Object} properties The key-value pair(s) to add/update in the experiment's config file
 * @param {boolean} verbose Output extra information to the console for debugging purposes
 * @returns {Promise} A promise that resolves when the updated config file is written
 */
export function updateExpConfig(experimentPath, properties, verbose) {
  if (verbose) console.log('--verbose flag set inside updateExpConfig()');
  try {
    const experimentName = path.basename(experimentPath);
    if (verbose) console.log('Updating config file for', experimentName);
    // Read in the experiment's config file and set the 'archived' flag to true
    const configPath = path.join(experimentPath, 'config.yaml');
    const config = jsYaml.load(fs.readFileSync(configPath, 'utf8'));
    // In verbose mode, tell the user if any of the keys are already set to the specified value
    if (verbose) {
      Object.keys(properties).forEach((key) => {
        if (config[key] === properties[key]) {
          console.log(`"${key}" is already set to "${properties[key]}" in config for ${experimentName}`);
        }
      });
    }
    // Add/update the specified key-value pair(s)
    Object.assign(config, properties);
    return fs.promises.writeFile(configPath, jsYaml.dump(config));
  } catch (e) {
    console.error(`Failed to update config file for ${experimentName}`, e);
    throw e;
  }
};
