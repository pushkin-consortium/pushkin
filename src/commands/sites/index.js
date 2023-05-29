import fs from 'fs';
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


export function listSiteTemplates() {
  return templates;
}

export const promiseFolderInit = async (initDir, dir) => {
  console.log(`Installing dependencies for ${dir}`);
  try {
    await exec(pacMan.concat(' install --mutex network'), { cwd: path.join(initDir, dir) })
    console.log(`Building ${dir}`);
    updatePushkinJs(); //synchronous
    setEnv(false); //synchronous
    console.log(`Building front end`)
    await exec(pacMan.concat(' run build'), { cwd: path.join(initDir, dir) })
    console.log(`${dir} is built`);
  } catch(e) {
    console.error(`Problem installing dependencies for ${dir}`)
    throw(e)
  }
  return "Built"
}

export async function getPushkinSite(initDir, url) {
  process.chdir(initDir); // Node command to change directory

  const newDirs = ['pushkin', 'experiments'];
  const newFiles = ['pushkin.yaml'];

  // make sure nothing to be created already exists
  newDirs.forEach((d) => {
    const dir = path.join(initDir, d);
    if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) { console.error(`Failed to initialize pushkin project: directory ${dir} already exists`); }
  });
  newFiles.forEach((f) => {
    const file = path.join(initDir, f);
    if (fs.existsSync(file) && !fs.lstatSync(file).isDirectory()) { console.error(`Failed to initialize pushkin project: file ${file} already exists`); }
  });

  // download files
  if (!url) {
    console.error('URL is not well-defined.');
    return;
  }
  console.log(`retrieving from ${url}`);
  console.log('be patient...');
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
        console.log('finished downloading');
        var zip = new admZip('temp.zip');
        await zip.extractAllTo('.', true);
        await Promise.all([
          fs.promises.rename('pushkin/pushkin.yaml.bak', './pushkin.yaml').catch((err) => { console.error(err); }),
          fs.promises.rename('pushkin/config.js.bak', 'pushkin/front-end/src/config.js').catch((err) => { console.error(err); })
        ]);
        fs.promises.mkdir('experiments').catch((err) => { console.error(err); });
        if (fs.existsSync('__MACOSX')) {
          const shellresp = shell.rm('-rf','__MACOSX'); //fs doesn't have a stable directly removal function yet
        }      
        fs.promises.unlink('temp.zip');

        const apiPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'api').catch((err) => { console.error(err); });
        const frontendPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'front-end').catch((err) => { console.error(err); });
        await Promise.all([apiPromise, frontendPromise]);
        resolve(true);
      })
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
