import fs from 'graceful-fs';
import path from 'path';
import sa from 'superagent';
import admZip from 'adm-zip';
import got from 'got';
import { templates } from './templates.js';
import { promiseFolderInit } from '../sites/index.js'; //useful utility function
import { readConfig } from '../prep/index.js'; //useful utility function
import replace from 'replace-in-file';
import jsYaml from 'js-yaml';
import util from 'util';
const exec = util.promisify(require('child_process').exec);
const shell = require('shelljs');
import pacMan from '../../pMan.js'; //which package manager is available?

// This may be overly restrictive in some cases
const isValidExpName = (name) => (/^([a-zA-Z])([a-zA-Z0-9_])*$/.test(name));

export async function listExpTemplates() {
  return templates
}


const promiseExpFolderInit = async (initDir, dir, rootDir, modName, buildPath, verbose) => {
  //Similar to 'promiseFolderInit' in sites/index.js.
  //Modified to take advantage of yalc (not relevant for sites)
  if (verbose) console.log('--verbose flag set inside promiseExpFolderInit()');
  return new Promise ((resolve, reject) => {
    if (verbose) console.log(`Installing dependencies for ${dir}`);
    try {
      exec(pacMan.concat(' --mutex network install'), { cwd: path.join(initDir, dir) })
        .then(() => {
          if (verbose) console.log(`Building ${modName} from ${dir}`);
          exec(pacMan.concat(' --mutex network run build'), { cwd: path.join(initDir, dir) })
            .then(() => {
              if (verbose) console.log(`${modName} is built`);
              exec('yalc publish', { cwd: path.join(initDir, dir) })
                .then(() => {
                  if (verbose) console.log(`${modName} is published locally via yalc`);
                  exec('yalc add '.concat(modName), { cwd: path.join(rootDir, buildPath) })
                    .then(() => {
                      if (verbose) console.log(`${modName} added to build cycle via yalc`);                  
                      resolve(modName)
                    })
                })
            })
      })
    } catch (e) {
      console.error('Problem installing dependencies for ${dir}')
      throw(e)
    }
  })
}

export async function getExpTemplate(experimentsDir, url, longName, newExpName, rootDir, verbose) {
  if (verbose) console.log('--verbose flag set inside getExpTemplate()');
  if (!isValidExpName(newExpName)) {
    console.error(`'${newExpName}' is not a valid name. Names must start with a letter and can only contain alphanumeric characters.`);
    return;
  }
  if (verbose) console.log(`Making ${newExpName} in ${experimentsDir}`);
  const newDir = path.join(experimentsDir, newExpName);
  if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()) {
    console.error(`A directory in the experiments folder already exists with this name (${newExpName})`);
    return;
  }

  // download files
  if (!url) {
    console.error('Problem with URL for download.');
    return;
  }
  fs.mkdirSync(newDir);
  if (verbose) console.log(`retrieving from ${url}`);
  if (verbose) console.log('be patient...');
  let response
  try {
    response = await got(url);
  } catch (error) {
    console.error('Unable to download from specified site. Make sure your internet is on. If it is on but this error repeats, ask for help on the Pushkin forum.');
    throw error
  }
  let zipball_url
  try {
    zipball_url = JSON.parse(response.body).assets[0].browser_download_url;
  } catch(e) {
    console.error('Problem parsing github JSON');
    throw e
  }
  sa
    .get(zipball_url)
    .on('error', function(error){
      console.error('Download failed: ',error);
      process.exit();
    })
    .pipe(fs.createWriteStream('temp.zip'))
    .on('finish', async () => {
      if (verbose) console.log('finished downloading');
      var zip = new admZip('temp.zip');
      await zip.extractAllTo(newDir, true);
      await fs.promises.unlink('temp.zip');
      shell.rm('-rf','__MACOSX');
      await initExperiment(newDir, newExpName, longName, rootDir, verbose);
    })
}

export async function copyExpTemplate(experimentsDir, expPath, longName, newExpName, rootDir, verbose) {
  if (verbose) console.log('--verbose flag set inside copyExpTemplate()');
  if (!expPath) {
    console.error('No path provided.');
    return;
  }
  // Check that path exists and has what we need
  fs.existsSync(expPath, (exists) => {
    if (!exists) {
      console.error('That path does not exist. Try again');
      return;
    }})
  fs.existsSync(path.join(expPath, "api controllers"), (exists) => {
    if (!exists) {
      console.error('Path to template does not contain an api controllers folder.');
      return;
    }
  })
  fs.existsSync(path.join(expPath, "migrations"), (exists) => {
    if (!exists) {
      console.error('Path to template does not contain a migrations folder.');
      return;
    }
  })
  fs.existsSync(path.join(expPath, "web page"), (exists) => {
    if (!exists) {
      console.error('Path to template does not contain a web page folder.');
      return;
    }
  })
  fs.existsSync(path.join(expPath, "worker"), (exists) => {
    if (!exists) {
      console.error('Path to template does not contain a worker folder.');
      return;
    }
  })

  if (!isValidExpName(newExpName)) {
    console.error(`'${newExpName}' is not a valid name. Names must start with a letter and can only contain alphanumeric characters.`);
    return;
  }
  if (verbose) console.log(`Making ${newExpName} in ${experimentsDir}`);
  const newDir = path.join(experimentsDir, newExpName);
  if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()) {
    console.error(`A directory in the experiments folder already exists with this name (${newExpName})`);
    return;
  }

  fs.mkdirSync(newDir);
  if (verbose) {
    console.log(`copying from ${expPath}`);
    console.log('be patient...');
  }
  try {
    fs.cpSync(expPath, newDir, {recursive: true})
  } catch (error) {
    console.log(`failed to copy pushkin experiment template: ${error}`);
    throw error; 
  }  
  shell.rm('-rf','__MACOSX');
  return(initExperiment(newDir, newExpName, longName, rootDir, verbose));
}

// Takes a path to a jsPsych experiment and returns the timeline procedure
// from the declaration of the timeline up to the call to jsPsych.run()
export function getJsPsychTimeline(experimentPath, verbose) {
  if (verbose) console.log('--verbose flag set inside getJsPsychTimeline()');
  // Read in entire experiment file as text
  let jsPsychExp = fs.readFileSync(experimentPath, 'utf8');
  // Extract timeline name by looking for the argument supplied to jsPsych.run()
  let timelineName = jsPsychExp.match(/(?<=jsPsych\.run\().+?(?=\))/g)[0]; // [0] because match() returns an array
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
    return jsPsychExp.slice(timelineBegin, timelineEnd);
  }
}

// Takes a path to a jsPsych experiment and an array of the necessary plugins
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
    console.log('Could not extract any plugins from jsPsych experiment.\nMake sure you import the plugins you need in experiment.js');
    return;
  } else {
    if (verbose) console.log('Found jsPsych packages:\n\t', plugins.join('\n\t'));
    return plugins;
  }
}

// Takes an array of plugin names and returns an object
// mapping the plugin names with which we need to import them
export function getJsPsychImports(plugins, verbose) {
  if (verbose) console.log('--verbose flag set inside getJsPsychImports()');
  let imports = {};
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
    return imports;
  } else {
    return; // If no plugins were found, return undefined
  }
}

const initExperiment = async (expDir, expName, longName, rootDir, verbose) => {
  if (verbose) console.log('--verbose flag set inside initExperiment()');
  const options = {
    files: expDir.concat('/**/*.*'),
    from: /pushkintemplate/g,
    to: expName,
  };
  try {
    const results = await replace(options)
  }
  catch (error) {
    console.error('Error occurred:', error);
  }


  let files
  try {
    files = fs.readdirSync(path.join( expDir, "migrations" ))
  } catch (e) {
    console.error(`Could not read migrations folder`)
    throw e
  }
  let oldMigrations
  files.forEach((f) => {
    if (f.search("create")) {
      oldMigrations = f;
    }
  })
  let newMigrations = oldMigrations.split("_create")[1]

  let renamedMigrations
  try {
    fs.promises.rename(path.join( expDir, "migrations", oldMigrations), path.join( expDir, "migrations", expName.concat("_create").concat(newMigrations)))
  } catch (e) {
    console.error(`Failed to rename migrations file`)
    throw e
  }

  //now that names are updated, load config
  let expConfig;
  try {
    expConfig = readConfig(expDir);
  } catch (err) {
    console.error(`Failed to read experiment config file for `.concat(expName));
    throw err;
  }
  expConfig.experimentName = longName;
  expConfig.shortName = expName;

  try {
    fs.writeFileSync(path.join(expDir, 'config.yaml'), jsYaml.safeDump(expConfig), 'utf8');
  } catch (e) {
    console.error("Unable to update config.yaml");
    throw e
  }
  const apiPromise = promiseExpFolderInit(expDir, expConfig.apiControllers.location, rootDir, expName.concat('_api'), 'pushkin/api', verbose).catch((err) => { console.error(err); });
  const webPromise = promiseExpFolderInit(expDir, expConfig.webPage.location, rootDir, expName.concat('_web'), 'pushkin/front-end', verbose).catch((err) => { console.error(err); });
  //note that Worker uses a different function, because it doesn't need yalc; it's published straight to Docker
  const workerPromise = promiseFolderInit(expDir, 'worker', verbose).catch((err) => { console.error(err); });

  // write out new compose file with worker service
  const composeFileLoc = path.join(path.join(rootDir, 'pushkin'), 'docker-compose.dev.yml');
  let compFile;
  try { 
    compFile = jsYaml.safeLoad(fs.readFileSync(composeFileLoc), 'utf8'); 
    if (verbose) console.log('loaded compFile');
  } catch (e) { 
    console.error('Failed to load main docker compose file: ', e);
    process.exit() 
  }
  await workerPromise //Need this to write docker-compose file

  const workerConfig = expConfig.worker;
  const workerService = workerConfig.service;
  const workerName = `${expName}_worker`.toLowerCase(); //Docker names must all be lower case
  const workerLoc = path.join(expDir, workerConfig.location);
  const serviceContent = { ...workerService, image: workerName };
  serviceContent.labels = { ...(serviceContent.labels || {}), isPushkinWorker: true };
  compFile.services[workerName] = serviceContent;
  try {
    fs.writeFileSync(composeFileLoc, jsYaml.safeDump(compFile), 'utf8');
  } catch (e) { 
    console.error('Failed to create new compose file', e); 
    process.exit()
  }

  const contName = await apiPromise //Need this to write api controllers list

  //Handle API includes
  //Need to read in controllers.json and append a controller to it.
  let controllersJsonFile
  try {
    controllersJsonFile = JSON.parse(fs.readFileSync(path.join(rootDir, 'pushkin/api/src/controllers.json')))
  } catch(e) {
    console.error('Failed to load api/src/controllers.json');
    throw e
  }
  if (controllersJsonFile.hasOwnProperty(contName)){
    console.error("There is already an API controller by the name of ", expName)
    throw new Error("Problem adding API controller to controller list.")
  }
  controllersJsonFile[contName] = expName
  try {
   fs.writeFileSync(path.join(rootDir, 'pushkin/api/src/controllers.json'), JSON.stringify(controllersJsonFile), 'utf8')
  } catch (e) {
    console.error("Couldn't write controllers list");
    throw e
  }

  return await Promise.all([ webPromise, renamedMigrations])
};
