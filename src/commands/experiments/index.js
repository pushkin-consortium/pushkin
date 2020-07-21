import fs from 'fs';
import path from 'path';
import sa from 'superagent';
import admZip from 'adm-zip';
import got from 'got';
import { templates } from './templates.js';
import { promiseFolderInit } from '../sites/index.js'; //useful utility function
import replace from 'replace-in-file';
const shell = require('shelljs');

// This may be overly restrictive in some cases
const isValidExpName = (name) => (/^([a-zA-Z])([a-zA-Z0-9_])*$/.test(name));

export function listExpTemplates() {
    return new Promise((resolve, reject) => {
    try { 
      resolve(templates.map((t) => (t.name)));
    } catch (e) { 
      console.error(`Something is wrong with experiments/templates.js, error: ${e}`); 
      process.exit(); 
    }
  })
}


export async function getExpTemplate(experimentsDir, templateName, newExpName) {
  if (!isValidExpName(newExpName)) {
    console.error(`'${newExpName}' is not a valid name. Names must start with a letter and can only contain alphanumeric characters.`);
    return;
  }
  console.log(`Making ${newExpName} in ${experimentsDir}`);
  const newDir = path.join(experimentsDir, newExpName);
  if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()) {
    console.error(`A directory in the experiments folder already exists with this name (${newExpName})`);
    return;
  }

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
  fs.mkdirSync(newDir);
  console.log(`retrieving from ${url}`);
  console.log('be patient...');
  let zipball_url;
  try {
    const response = await got(url);
    zipball_url = JSON.parse(response.body).assets[0].browser_download_url;
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
      await zip.extractAllTo(newDir, true);
      await fs.promises.unlink('temp.zip');
      shell.rm('-rf','__MACOSX');
      await initExperiment(newDir, newExpName);
    })
}

const initExperiment = async (expDir, expName) => {
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
  const apiPromise = promiseFolderInit(expDir, 'api controllers').catch((err) => { console.error(err); });
  const webPromise = promiseFolderInit(expDir, 'web page').catch((err) => { console.error(err); });
  const workerPromise = promiseFolderInit(expDir, 'worker').catch((err) => { console.error(err); });
  await Promise.all([apiPromise, webPromise, workerPromise])
};

