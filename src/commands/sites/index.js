import fs from 'fs';
import util from 'util';
import path from 'path';
import sa from 'superagent';
import admZip from 'adm-zip';
import got from 'got';
import * as compose from 'docker-compose'
const exec = util.promisify(require('child_process').exec);
import { templates } from './templates.js';
const shell = require('shelljs');

export function listSiteTemplates() {
    return new Promise((resolve, reject) => {
    try { 
      resolve(templates.map((t) => (t.name)));
    } catch (e) { 
      console.error(`Something is wrong with sites/templates.js, error: ${e}`); 
      process.exit(); 
    }
  })
}

export const promiseFolderInit = async (initDir, dir) => {
  console.log(`Installing npm dependencies for ${dir}`);
  const { stdout, stderr } = await exec('npm install', { cwd: path.join(initDir, dir) }) //this may not work on Windows
  if (stderr) console.log(stderr);
  console.log(`Building ${dir}`);
  const { stdout2, stderr2 } = await exec('npm run build', { cwd: path.join(initDir, dir) }) //this may not work on Windows
  if (stderr2) {
    console.log(stderr2)
  }
  console.log(`${dir} is built`);
  return new Promise ((resolve, reject) => {
    resolve("built")
  })
}

export async function getPushkinSite(initDir, templateName) {
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
  let url;
  for (const val in templates) {
    if (templates[val].name == templateName) {
      url = templates[val].url;
    }
  }
  if (!url) {
    console.error('Unable to download from specified site. Make sure your internet is on. If it is on but this error repeats, ask for help on the Pushkin forum.');
    return;
  }
  console.log(`retrieving from ${url}`);
  console.log('be patient...');
  let zipball_url;
  try {
    const response = await got(url);
    zipball_url = JSON.parse(response.body).assets[0].browser_download_url;
    console.log(zipball_url)
  } catch (error) {
    console.log(error.response.body);
    throw new Error('Problem parsing github JSON');
  }
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
        await fs.promises.rename('pushkin/pushkin.yaml.bak', './pushkin.yaml').catch((err) => { console.error(err); }),
        await fs.promises.rename('pushkin/config.js.bak', 'pushkin/front-end/src/config.js').catch((err) => { console.error(err); })
      ]);
      fs.promises.mkdir('experiments').catch((err) => { console.error(err); });
      if (fs.existsSync('__MACOSX')) {
        const shellresp = shell.rm('-rf','__MACOSX'); //fs doesn't have a stable directly removal function yet
      }      
      fs.promises.unlink('temp.zip');

      const apiPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'api').catch((err) => { console.error(err); });
      const frontendPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'front-end').catch((err) => { console.error(err); });
      await Promise.all([apiPromise, frontendPromise]);
      return true;
    })
}

export async function pushkinInit(initDir) {
  //Deprecated. Shouldn't really need this. Keeping it as a useful example of working with Docker.
  //However, the same thing can be achieved by adding 'POSTGRES_DB: test_db' to the docker-compose environment variables.
      const apiPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'api').catch((err) => { console.error(err); });
      const frontendPromise = promiseFolderInit(path.join(initDir, 'pushkin'), 'front-end').catch((err) => { console.error(err); });
      const dbPromise = compose.upOne('test_db', {cwd: path.join(initDir, 'pushkin'), config: 'docker-compose.dev.yml'})
        .then((resp) => resp, err => console.log('something went wrong:', err))
      
      const wait = async () => {
        //Sometimes, I really miss loops
        let x = await compose.ps({cwd: path.join(initDir, 'pushkin'), config: 'docker-compose.dev.yml'})
              .then((x) => x.out.search('healthy'), err => {console.error(err)})
        if (x) {
          console.log(x);
          return compose.exec('test_db', ['psql', '-U', 'postgres', '-c', 'create database test_db'], {cwd: path.join(initDir, 'pushkin'), config: 'docker-compose.dev.yml'})
            .then((resp) => resp, err => console.log('something went wrong:', err))
        } else {
          setTimeout( wait, 500 );
        }
      }
      const dbCreate = wait(); //ridiculously roundabout loop
      return await Promise.all([apiPromise, frontendPromise, dbPromise, dbCreate]);
}
