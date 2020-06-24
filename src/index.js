#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { execSync, exec } from 'child_process'; // eslint-disable-line
// subcommands
import { listExpTemplates, getExpTemplate,  } from './commands/experiments/index.js';
import { initExperiment, listSiteTemplates, getPushkinSite } from './commands/sites/index.js';
import prep from './commands/prep/index.js';
import setupdb from './commands/setupdb/index.js';
import * as compose from 'docker-compose'
import { Command } from 'commander'
import inquirer from 'inquirer'

const program = new Command();
program.version('0.0.1');

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
      process.exit(); 
    }
  })
};

const handleViewConfig = async (what) => {
  moveToProjectRoot();
  let x = await ((what=='site' | !what) ? loadConfig(path.join(process.cwd(), 'pushkin.yaml')) : '')
  console.log(x)
  let exps = fs.readdirSync(path.join(process.cwd(), 'experiments'));
  let y = await Promise.all(exps.map(async (exp) => {
    return await (what == exp | !what) ? loadConfig(path.join(process.cwd(), 'experiments', exp, 'config.yaml')) : '';
  }));
  console.log(y);
  //Thanks to https://stackoverflow.com/questions/49627044/javascript-how-to-await-multiple-promises
}

const handleInstall = async (what) => {
  if (what == 'site'){
    const siteList = await listSiteTemplates();
    inquirer
      .prompt([
        { type: 'list', name: 'sites', choices: siteList, default: 0, message: 'Which site template do you want to use?'}
        ]).then(answers => getPushkinSite(process.cwd(),answers.sites))
  } else {
    //definitely experiment then
    moveToProjectRoot()
    const expList = await listExpTemplates();
    inquirer.prompt([
        { type: 'list', name: 'experiments', choices: expList, default: 0, message: 'Which site template do you want to use?'}
        ]).then(answers => {
          let expType = answers.experiments
          console.log(expType)
          inquirer.prompt([
            { type: 'input', name: 'name', message: 'What do you want to call your experiment?'}]).then(async (answers) => {
              let config = await loadConfig('pushkin.yaml');
              console.log(expType)
              getExpTemplate(path.join(process.cwd(), config.experimentsDir), expType, answers.name)
            })
      })
  } 
}

const printOpts = function() {
  if (program.debug) console.log(program.opts());
  console.log('pizza details:');
  if (program.small) console.log('- small pizza size');
  if (program.pizzaType) console.log(`- ${program.pizzaType}`);
}
 
async function main() {
  program
    .option('-d, --debug', 'output extra debugging')
    .option('-s, --small', 'small pizza size')
    .option('-p, --pizza-type <type>', 'flavour of pizza');

  program
    .command('config [what]')
    .description('View config file for `what`, with possible values being `site` or any of the installed experiments by name. Defaults to all.')
    .action((what) => {
      handleViewConfig(what)
    });

  program
    .command('install <what>')
    .description(`Install template website ('site') or experiment ('experiment').`)
    .action((what) => {
      if (what == 'site' | what == 'experiment'){
        handleInstall(what)  
      }else{
        console.error(`Command not recognized. Run 'pushkin --help' for help.`)
      }
    });

   program.parseAsync(process.argv);

}

main();
//program.parseAsync(process.argv);
 
