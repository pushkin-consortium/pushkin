#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { execSync, exec } from 'child_process'; // eslint-disable-line
// subcommands
import { listExpTemplates, getExpTemplate, listSiteTemplates, getPushkinSite } from './commands/generate/index.js';
import { pushkinInit, initExperiment } from './commands/init/index.js';
import prep from './commands/prep/index.js';
import setupdb from './commands/setupdb/index.js';
import * as compose from 'docker-compose'

const moveToProjectRoot = () => {
  // better checking to make sure this is indeed a pushkin project would be good
  while (process.cwd() != path.parse(process.cwd()).root) {
    if (fs.existsSync(path.join(process.cwd(), 'pushkin.yaml'))) return;
    process.chdir('..');
  }
  throw new Error('No pushkin project found here or in any above directories');
};
const loadConfig = () => {
  // could add some validation to make sure everything expected in the config is there
  try { return jsYaml.safeLoad(fs.readFileSync('pushkin.yaml', 'utf8')); } catch (e) { console.error(`Pushkin config file missing, error: ${e}`); process.exit(); }
};

// ----------- process command line arguments ------------
const inputGetter = () => {
  let remainingArgs = process.argv;
  return () => {
    const commandOps = [{ name: 'name', defaultOption: true }];
    const mainCommand = commandLineArgs(
      commandOps,
      { argv: remainingArgs, stopAtFirstUnknown: true },
    );
    remainingArgs = mainCommand._unknown || [];
    return mainCommand.name;
  };
};
const nextArg = inputGetter();

(() => {
  switch (nextArg()) {
    case 'site': {
      const arg = nextArg();
      switch (arg) {
        case 'list':
          listSiteTemplates();
          return;
        default:
          getPushkinSite(process.cwd(), arg);
          return;
      }
      return;
    }
    case 'init': {
      const arg = nextArg();
      moveToProjectRoot();
      const config = loadConfig();
      switch (arg) {
        case 'site':
          pushkinInit(process.cwd());
          return;
        default:
          initExperiment(path.join(process.cwd(), config.experimentsDir, arg), arg);
          return;
      }
    }
    case 'experiment': {
      const arg = nextArg();
      switch (arg) {
        case 'list':
          listExpTemplates();
          return;
        default:
          moveToProjectRoot();
          const config = loadConfig();
          const name = nextArg(); // Retrieves name of experiment, passed as argument to 'pushkin generate'
          getExpTemplate(path.join(process.cwd(), config.experimentsDir), arg, name);
          return;
      }
    }
    case 'prep': {
      moveToProjectRoot();
      const config = loadConfig();
      prep(
        path.join(process.cwd(), config.experimentsDir),
        path.join(process.cwd(), config.coreDir),
        (err) => {
          if (err) console.error(`Error prepping: ${err}`);
        },
      );
      return;
    }
    case 'setupdb': {
      moveToProjectRoot();
      const config = loadConfig();
      setupdb(config.databases, path.join(process.cwd(), config.experimentsDir));
      return;
    }
    case 'start': {
      moveToProjectRoot();
      compose.upAll({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml', log: true, composeOptions: ['--verbose']})
        .then(
          out => { console.log(out.out, 'Starting. You may not be able to load localhost for a minute or two.')},
          err => { console.log('something went wrong:', err.message)}
        );
      //exec('docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;');
      return;
    }
    case 'stop': {
      moveToProjectRoot();
      compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
        .then(
          out => { console.log(out.out, 'done')},
          err => { console.log('something went wrong:', err.message)}
        );
      //exec('docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;');
      return;
    }
    case 'kill': {
      console.log('Removing all containers and volumes, as well as pushkin images. To additionally remove third-party images, run `pushkin armageddon`.') 
      moveToProjectRoot();
      compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
        .then(
          out => { 
            exec('docker volume rm pushkin_test_db_volume pushkin_message_queue_volume; docker rm $(docker ps -a -f status=exited -q); docker images -a | grep "pushkin*" | awk `{print $3}` | xargs docker rmi -f');
            console.log(out.out, 'done');
          },
          err => { console.log('something went wrong:', err.message)}
        );
      return;
    }

    case 'armageddon': {
      exec('docker stop $(docker ps -aq); docker rm $(docker ps -aq); docker network prune -f; docker rmi -f $(docker images --filter dangling=true -qa); docker volume rm $(docker volume ls --filter dangling=true -q); docker rmi -f $(docker images -qa);', (err, stdout, stderr) => {
			  if (err) {
    			console.log(`Error resetting docker containers and volumes: ${err}`);
			  }
      });
    }
    default: {
      const usage = 'command not recognized';
      console.error(usage);
    }
  }
})();
