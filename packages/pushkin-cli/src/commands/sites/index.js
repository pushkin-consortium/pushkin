import fs from 'graceful-fs';
import util from 'util';
import path from 'path';
import sa from 'superagent';
import admZip from 'adm-zip';
import got from 'got';
import * as compose from 'docker-compose'
const exec = util.promisify(require('child_process').exec);
import { templates } from './templates.js';
import { execSync } from 'child_process'; // eslint-disable-line
import { updatePushkinJs, setEnv } from '../prep/index.js'
const shell = require('shelljs');
import pacMan from '../../pMan.js';  //which package manager is available?


export const initSite = async (verbose) => {
  try {
    // Check that there isn't already a package.json
    if (fs.existsSync('package.json')) {
      console.error("A package.json already exists in this directory. You should run `pushkin install site` in a new directory.");
      process.exit(1);
    }
    if (fs.existsSync('pushkin')) {
      console.error("A `pushkin` directory already exists here. You should run `pushkin install site` in a new directory.");
      process.exit(1);
    }
    try {
      // Make sure files with passwords don't get pushed to GitHub
      const ignoreFiles = ['pushkin.yaml', '.docker', '.DS_Store', 'node_modules', 'build'];
      fs.writeFileSync('.gitignore', ignoreFiles.join('\n'));
    } catch (e) {
      console.error('Unable to write .gitignore during site template setup');
      process.exit(1);
    }
    // Create the package.json
    if (verbose) console.log("Setting up site package");
    await exec(`${pacMan} init -yp`);
    // Edit package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json'), 'utf8');
    delete packageJson.main;
    packageJson.name = 'pushkin-site';
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.error('Error setting up site package:', error);
  }
}

export function listSiteTemplates() {
  return templates;
}

export const promiseFolderInit = async (initDir, dir, verbose) => {
  if (verbose) {
    console.log('--verbose flag set inside promiseFolderInit()');
    console.log(`Installing dependencies for ${dir}`);
  }
  try {
    await exec(pacMan.concat(' --mutex network install'), { cwd: path.join(initDir, dir) })
    if (verbose) console.log(`Building ${dir}`);
    updatePushkinJs(verbose); //synchronous
    setEnv(false, verbose); //synchronous
    if (verbose) console.log(`Building front end`);
    await exec(pacMan.concat(' --mutex network run build'), { cwd: path.join(initDir, dir) })
    if (verbose) console.log(`${dir} is built`);
  } catch(e) {
    console.error(`Problem installing dependencies for ${dir}`)
    throw(e)
  }
  return "Built"
}

export async function setupPushkinSite(verbose) {
  if (verbose) console.log('--verbose flag set inside setupPushkinSite()');
  shell.rm('-rf','__MACOSX'); // fs doesn't have a stable direct removal function yet      
  return new Promise((resolve, reject) => {
    // Move/rename pushkin.yaml and config.js in their proper locations
    const pushkinYaml = fs.promises.rename('pushkin/pushkin.yaml.bak', './pushkin.yaml').catch((e) => { console.error(e); });
    const configJS = fs.promises.rename('pushkin/config.js.bak', 'pushkin/front-end/src/config.js').catch((e) => { console.error(e); });
    // Make the experiments directory
    const mkExps = fs.promises.mkdir('experiments').catch((err) => { console.error(err); });
    const apiPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'api', verbose).catch((err) => { console.error(err); });
    const frontendPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'front-end', verbose).catch((err) => { console.error(err); });
    resolve(Promise.all([pushkinYaml, configJS, mkExps, apiPromise, frontendPromise]));
  })
}

export async function getPushkinSite(initDir, url, verbose) {
  if (verbose) console.log('--verbose flag set inside getPushkinSite()');

  process.chdir(initDir); // Node command to change directory

  const newDirs = ['pushkin', 'experiments'];
  const newFiles = ['pushkin.yaml'];

  // make sure nothing to be created already exists
  newDirs.forEach((d) => {
    const dir = path.join(initDir, d);
    if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) { console.error(`Failed to initialize pushkin project: directory ${dir} already exists`); process.exit(1); }
  });
  newFiles.forEach((f) => {
    const file = path.join(initDir, f);
    if (fs.existsSync(file) && !fs.lstatSync(file).isDirectory()) { console.error(`Failed to initialize pushkin project: file ${file} already exists`); process.exit(1); }
  });

  // download files
  if (!url) {
    console.error('URL is not well-defined.');
    return;
  }
  if (verbose) {
    console.log(`retrieving from ${url}`);
    console.log('be patient...');
  }
  let zipball_url;
  let response
  try {
    response = await got(url);
    zipball_url = JSON.parse(response.body).assets[0].browser_download_url;
  } catch (error) {
    console.error('Unable to download from specified site. Make sure your internet is on. If it is on but this error repeats, ask for help on the Pushkin forum.');
    throw error;
  }
  return new Promise((resolve, reject) => {
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
        await zip.extractAllTo('.', true);
        await Promise.all([
          await fs.promises.rename('pushkin/pushkin.yaml.bak', './pushkin.yaml').catch((err) => { console.error(err); }),
          await fs.promises.rename('pushkin/config.js.bak', 'pushkin/front-end/src/config.js').catch((err) => { console.error(err); })
        ]);
        try {
          //Make sure files with passwords don't get tracked in github
          fs.writeFileSync('.gitignore', 'pushkin.yaml');
        } catch (e) {
          console.error('Unable to update .gitignore when extracting pushkin.yaml')
          throw e
        }

        fs.promises.mkdir('experiments').catch((err) => { console.error(err); });
        if (fs.existsSync('__MACOSX')) {
          const shellresp = shell.rm('-rf','__MACOSX'); //fs doesn't have a stable directly removal function yet
        }      
        fs.promises.unlink('temp.zip');
        const apiPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'api', verbose).catch((err) => { console.error(err); });
        const frontendPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'front-end', verbose).catch((err) => { console.error(err); });
        resolve(Promise.all([apiPromise, frontendPromise]));
      })
  })
}

export async function copyPushkinSite(initDir, pathToSite, verbose) {
  if (verbose) console.log('--verbose flag set inside copyPushkinSite()');
  
  //For using a local Pushkin site template
  process.chdir(initDir); // Node command to change directory

  const newDirs = ['pushkin', 'experiments'];
  const newFiles = ['pushkin.yaml'];

  // make sure nothing to be created already exists
  newDirs.forEach((d) => {
    const dir = path.join(initDir, d);
    if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) { console.error(`Failed to initialize pushkin project: directory ${dir} already exists`); process.exit(1); }
  });
  newFiles.forEach((f) => {
    const file = path.join(initDir, f);
    if (fs.existsSync(file) && !fs.lstatSync(file).isDirectory()) { console.error(`Failed to initialize pushkin project: file ${file} already exists`); process.exit(1);}
  });

  if (!pathToSite) {
    console.error('No path provided.');
    return;
  }
  // Check that path exists and has what we need
  fs.existsSync(pathToSite, (exists) => {
    if (!exists) {
      console.error('That path does not exist. Try again');
      return;
    }})
  fs.existsSync(path.join(pathToSite, "pushkin"), (exists) => {
    if (!exists) {
      console.error('Path to template does not contain a pushkin folder.');
      return;
    }
  })
  fs.existsSync(path.join(pathToSite, "users"), (exists) => {
    if (!exists) {
      console.error('Path to template does not contain a users folder.');
      return;
    }
  })
  // looks good
  if (verbose) {
    console.log(`retrieving from ${pathToSite}`);
    console.log('be patient...');
  }
  try {
    fs.cpSync(pathToSite, '.', {recursive: true})
  } catch (error) {
    console.log(`failed to copy pushkin site template: ${error}`);
    throw error; 
  }  
  return new Promise((resolve, reject) => {
    const pushkinYaml = fs.promises.rename('pushkin/pushkin.yaml.bak', './pushkin.yaml').catch((err) => { console.error(err); });
    const configJS = fs.promises.rename('pushkin/config.js.bak', 'pushkin/front-end/src/config.js').catch((err) => { console.error(err); });
    const mkExps = fs.promises.mkdir('experiments').catch((err) => { console.error(err); });
    if (fs.existsSync('__MACOSX')) {
      const shellresp = shell.rm('-rf','__MACOSX'); //fs doesn't have a stable directly removal function yet
    }      
    const apiPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'api', verbose).catch((err) => { console.error(err); });
    const frontendPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'front-end', verbose).catch((err) => { console.error(err); });
    resolve(Promise.all([apiPromise, frontendPromise, pushkinYaml, configJS, mkExps]));
  })
}


// export async function pushkinInit() {
//   //Deprecated. Shouldn't really need this. Keeping it as a useful example of working with Docker.
//   //However, the same thing can be achieved by adding 'POSTGRES_DB: test_db' to the docker-compose environment variables.
//       const dbPromise = compose.upOne('test_db', {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
//         .then((resp) => resp, err => console.log('something went wrong starting database container:', err))
      
//       const wait = async () => {
//         //Sometimes, I really miss loops
//         let x = await compose.ps({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
//               .then((x) => x.out.search('healthy'), err => {console.error('Problem with waiting:',err)})
//         if (x) {
//           console.log(x);
//           return compose.exec('test_db', ['psql', '-U', 'postgres', '-c', 'create database test_db'], {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
//             .then((resp) => resp, err => console.log('something went wrong:', err))
//         } else {
//           setTimeout( wait, 500 );
//         }
//       }
//       const dbCreate = wait(); //ridiculously roundabout loop
//       return await Promise.all([dbPromise, dbCreate]);
// }
