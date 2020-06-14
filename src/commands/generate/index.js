import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec } from 'child_process';
import replace from 'replace-in-file';
import { templates } from './templates.js';

const got = require('got'); // analog of curl
const shell = require('shelljs');

// This may be overly restrictive in some cases
const isValidExpName = (name) => (/^([a-zA-Z])([a-zA-Z0-9_])*$/.test(name));

export async function listExpTemplates() {
  const templateNames = templates.map((t) => (t.name));
  console.log(templateNames);
}

export async function listSiteTemplates() {
  const templateNames = templates.map((t) => (t.name));
  console.log(templateNames);
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
    console.error('There is no site template by that name. For a list, run "pushkin init list".');
    return;
  }
  fs.mkdirSync(newDir);
  console.log(`retrieving from ${url}`);
  console.log('be patient...');
  let zipball_url;
  try {
    const response = await got(url);
    zipball_url = JSON.parse(response.body).zipball_url;
  } catch (error) {
    console.log(error.response.body);
    throw new Error('Problem parsing github JSON');
  }
  shell.exec(`wget ${zipball_url} -O temp.zip`);
  shell.exec('unzip temp.zip -d temp');
  shell.rm('temp.zip');
  shell.mv('temp/*', 'temp/temp');
  shell.mv('temp/temp/*', 'temp/');
  shell.rm('-rf', 'temp/temp');
  shell.mv('temp/*', newDir);
}

export async function getPushkinSite(initDir, template) {
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
    if (templates[val].name == template) {
      url = templates[val].url;
    }
  }
  if (!url) {
    console.error('There is no site template by that name. For a list, run "pushkin init list".');
  }
  console.log(`retrieving from ${url}`);
  console.log('be patient...');
  let zipball_url;
  try {
    const response = await got(url);
    zipball_url = JSON.parse(response.body).zipball_url;
  } catch (error) {
    console.log(error.response.body);
    throw new Error('Problem parsing github JSON');
  }
  shell.exec(`wget ${zipball_url} -O temp.zip`);
  shell.exec('unzip temp.zip -d .');
  shell.rm('temp.zip');
  shell.mv('*', 'temp');
  shell.mv('temp/*', '.');
  shell.rm('-rf', 'temp');
  shell.mv('pushkin/pushkin.yaml.bak', './pushkin.yaml');
  shell.mv('pushkin/config.js.bak', 'pushkin/front-end/src/config.js');
  shell.mkdir('experiments');
  return true;
}

