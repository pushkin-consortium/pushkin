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
import { listSiteTemplates, getPushkinSite, pushkinInit } from './commands/sites/index.js';
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

const handleUpdateDB = async () => {
  moveToProjectRoot();
  const config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
  console.log('loaded Pushkin config file')
  return await setupdb(config.databases, path.join(process.cwd(), config.experimentsDir));
}

const handlePrep = async () => {
  moveToProjectRoot();
  const config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
  let out;
  try {
    out = await prep(
      path.join(process.cwd(), config.experimentsDir),
      path.join(process.cwd(), config.coreDir)
    );
  } catch (err) {
    console.error(err);
    process.exit();
  }
  return;  
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

const killLocal = async () => {
  console.log('Removing all containers and volumes, as well as pushkin images. To additionally remove third-party images, run `pushkin armageddon`.') 
  moveToProjectRoot();
  try {
    await compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
    await compose.rm({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
    await exec(`docker volume rm pushkin_test_db_volume pushkin_message_queue_volume; docker images -a | grep "pushkin*" | awk '{print $3}' | xargs docker rmi -f`)    
  } catch (err) {
    console.error('Problem with killing docker: ', err)
    process.exit();
  }
  console.log('done')
  return;  
}

async function main() {
//  program
//    .option('-d, --debug', 'output extra debugging')
//    .option('-s, --small', 'small pizza size')
//    .option('-p, --pizza-type <type>', 'flavour of pizza');

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

  program
    .command('init')
    .description(`Primarily for development. Don't use.`)
    .action(() => {
      pushkinInit();
    })

  program
    .command('updateDB')
    .description('Updates test database. This is automatically run as part of `pushkin prep`, so you are unlikely to need to use it directly.')
    .action(handleUpdateDB)

  program
    .command('prep')
    .description('Prepares local copy for local testing. This step includes running migrations, so be sure you have read the documentation on how that works.')
    .action(handlePrep)

  program
    .command('start')
    .description('Starts local deploy for debugging purposes. To start only the front end (no databases), see the manual.')
    .action(() => {
      moveToProjectRoot();
      compose.upAll({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml', log: true})
        .then(
          out => { console.log(out.out, 'Starting. You may not be able to load localhost for a minute or two.')},
          err => { console.log('something went wrong:', err.message)}
        );
      //exec('docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;');
      return;      
    })

  program
    .command('stop')
    .description('Stops the local deploy. This will not remove the local docker images. To do that, see documentation for pushkin kill and pushkin armageddon.')
    .action(() => {
      moveToProjectRoot();
      compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
        .then(
          out => { console.log(out.out, 'done')},
          err => { console.log('something went wrong:', err.message)}
        );
      //exec('docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;');
      return;      
    })

  program
    .command('kill')
    .description('Removes all containers and volumes from local Docker, as well as pushkin-specific images. To additionally remove third-party images, run `pushkin armageddon`.')
    .action(killLocal)

  program
    .command('armageddon')
    .description('Complete reset of the local docker. This will generate some error messages, which you can safely ignore.')
    .action(async () => {
      try {
        await exec('docker stop $(docker ps -aq); docker rm $(docker ps -aq); docker network prune -f; docker rmi -f $(docker images --filter dangling=true -qa); docker volume rm $(docker volume ls --filter dangling=true -q); docker rmi -f $(docker images -qa);')
      } catch (err) {
        console.err(err);
      }
    })

   program.parseAsync(process.argv);
}

main();
//program.parseAsync(process.argv);
 
