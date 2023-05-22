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
import { listSiteTemplates, getPushkinSite } from './commands/sites/index.js';
import { awsInit, nameProject, addIAM, awsArmageddon, awsList, createAutoScale } from './commands/aws/index.js'
import { prep, setEnv } from './commands/prep/index.js';
import { setupdb, setupTestTransactionsDB } from './commands/setupdb/index.js';
import * as compose from 'docker-compose'
import { Command } from 'commander'
import inquirer from 'inquirer'
import got from 'got';
const version = require("../package.json").version


const program = new Command();
program.version(version);


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

const handleAWSUpdate = async () => {
  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    throw e
  }

  console.log(`Loading deployment config`)
  //FUBAR

}


const handleCreateAutoScale = async () => {
  let projName
  try {
    let temp = loadConfig(path.join(process.cwd(), 'pushkin.yaml'))  
    projName = temp.info.projName.replace(/[^\w\s]/g, "").replace(/ /g,"")
  } catch (e) {
    console.error(`Unable to find project name`)
    throw e
  }

  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    throw e
  }

  return createAutoScale(useIAM.iam, projName)
}

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
  let settingUpDB, config;
  try {
     config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
  } catch (err) {
    console.log('Could not load pushkin.yaml');
    throw err
  }

  try {
    settingUpDB = await setupdb(config.databases, path.join(process.cwd(), config.experimentsDir));
  } catch (err) {
    console.error(err);
    process.exit();
  }
  return settingUpDB;
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

const handleAWSList = async () => {
  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  return awsList(useIAM.iam)
}

const handleAWSArmageddon = async () => {
  let nukeMe
  try {
    nukeMe = await inquirer.prompt([{ type: 'input', name: 'armageddon', message: `This command will DELETE your website. This cannot be undone.\n Are you SURE you want to do this?\n Confirm by typing 'armageddon'.`}])
  } catch (e) {
    console.error('Problem getting permission.\n', e)
    process.exit()
  }
  if (nukeMe.armageddon != 'armageddon') {
    console.log('That is probably wise. Exiting.')
    return
  }
  let nukeMeTwice
  try {
    nukeMeTwice = await inquirer.prompt([{ type: 'input', name: 'armageddon', message: `Your database -- along with any data -- will be deleted.\n Confirm this is what you want by typing 'nuke my data'.`}])
  } catch (e) {
    console.error('Problem getting permission.\n', e)
    process.exit()
  }
  if (nukeMeTwice.armageddon != 'nuke my data') {
    console.log('That is probably wise. Exiting.')
    return
  }
  console.log(`I hope you know what you are doing. This makes me nervous every time...`)
  let useIAM
  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  return awsArmageddon(useIAM.iam)
}

const getVersions = async (url) => {
  let response
  let body
  let verList = {}
  try {
    const response = await got(url);
    body = JSON.parse(response.body)
    body.forEach((r) => {
      verList[r.tag_name] = r.url;
    })
  } catch (error) {
    console.error('Problem parsing github JSON');
    throw error;
  }
  return verList
}

const handleInstall = async (what) => {
  try {
    if (what == 'site') {
      const siteList = await listSiteTemplates();
      inquirer.prompt([
          { type: 'list', name: 'sites', choices: Object.keys(siteList), default: 0, message: 'Which site template do you want to use?'}
        ]).then(answers => {
          let siteType = answers.sites
          getVersions(siteList[siteType])
          .then((verList) => {
            inquirer.prompt(
              [{ type: 'list', name: 'version', choices: Object.keys(verList), default: 0, message: 'Which version? (Recommend:'.concat(Object.keys(verList)[0]).concat(')')}]
            ).then(async (answers) => {
              await getPushkinSite(process.cwd(),verList[answers.version])
//              await setupTestTransactionsDB()
            })
          })
        })
    } else {
      //definitely experiment then
      moveToProjectRoot()
      const expList = await listExpTemplates();
      inquirer.prompt(
        [{ type: 'list', name: 'experiments', choices: Object.keys(expList), default: 0, message: 'Which experiment template do you want to use?'}]
      ).then(answers => {
        let expType = answers.experiments
        getVersions(expList[expType])
        .then((verList) => {
          inquirer.prompt(
            [{ type: 'list', name: 'version', choices: Object.keys(verList), default: 0, message: 'Which version? (Recommend:'.concat(Object.keys(verList)[0]).concat(')')}]
          ).then(answers => {
            let ver = answers.version
            const url = verList[ver]
            inquirer.prompt(
              [{ type: 'input', name: 'name', message: 'What do you want to call your experiment?'}]
            ).then(async (answers) => {
                const longName = answers.name
                const shortName = longName.replace(/[^\w\s]/g, "").replace(/ /g,"_");
                let config = await loadConfig('pushkin.yaml');
                getExpTemplate(path.join(process.cwd(), config.experimentsDir), url, longName, shortName, process.cwd())
            })
          })
        })
      })
    }
  } catch(e) {
    throw e
  }
}

const inquirerPromise = async (type, name, message) => {
  let answers = inquirer.prompt([ { type: 'input', name: 'name', message: 'Name your project'}])
  return answers[name]
}

const handleAWSInit = async (force) => {
  let temp

  try {
    execSync(`docker login`)
  } catch (e) {
    console.error(`Please log into DockerHub before continuing.\n Type '$ docker login' into the console.\n Provide your username and password when asked.`)
    process.exit()
  }

  let config
  try {
    config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'))
  } catch (e) {
    console.error(`Unable to load pushkin.yaml`)
    throw e
  }

  if (config.DockerHubID == '') {
    console.error(`Your DockerHub ID has not been configured. Please be sure you have a valid DockerHub ID and then run 'pushkin setDockerHub'.`)
    process.exit()
  }
  
  let projName, useIAM, awsName, stdOut

  try {
    execSync('aws --version')
  } catch(e) {
    console.error('Please install the AWS CLI before continuing.')
    process.exit();
  }

  let newProj = true
  if (config.info.projName) {
    let myChoices = (config.info.projName ? [config.info.projName, 'new'] : ['new'])
    try {
      projName = await inquirer.prompt([ { type: 'list', name: 'name', choices: myChoices, message: 'Which project?'}])
    } catch (e) {
      throw e
    }
    if (projName.name != "new") {
      newProj = false;
      awsName = config.info.awsName
    }
    if (force) {
      try {
        //Run this anyway to reset awsResources.js and remove productionDBs from pushkin.yaml
        awsName = await nameProject(projName.name)
      } catch (e) {
        throw e
      }
    }
  }

  if (newProj) {
    try {
      projName = await inquirer.prompt([ { type: 'input', name: 'name', message: 'Name your project'}])
    } catch(e) {
      console.error(e)
      process.exit()
    }
    try {
        awsName = await nameProject(projName.name)    
    } catch (e) {
      throw e
    }
  }


  try {
    useIAM = await inquirer.prompt([{ type: 'input', name: 'iam', message: 'Provide your AWS profile username that you want to use for managing this project.'}])
  } catch (e) {
    console.error('Problem getting AWS IAM username.\n', e)
    process.exit()
  }
  try {
    stdOut = execSync(`aws configure list --profile ${useIAM.iam}`).toString()
  } catch (e) {
    console.error(`The IAM user ${useIAM.iam} is not configured on the AWS CLI. For more information see https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html`)
    process.exit();
  }
  let addedIAM
  try {
    addedIAM = addIAM(useIAM.iam) //this doesn't need to be synchronous      
  } catch(e) {
    console.error(e)
    process.exit()
  }
  try {
    await Promise.all([awsInit(projName.name, awsName, useIAM.iam, config.DockerHubID), addedIAM])
  } catch(e) {
    throw e
  }
  console.log("done")

  return
}

const killLocal = async () => {
  console.log('Removing all containers and volumes, as well as pushkin images. To additionally remove third-party images, run `pushkin armageddon`.') 
  moveToProjectRoot();
  try {
    await compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
  } catch (err) {
    console.error('Problem with stopping docker: ', err)
    process.exit();
  }
  try {
    await compose.rm({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
  } catch (err) {
    console.error('Problem with removing docker containers: ', err)
    process.exit();
  }
  try {
    await exec(`docker volume rm pushkin_test_db_volume pushkin_message_queue_volume; docker images -a | grep "pushkin*" | awk '{print $3}' | xargs docker rmi -f`)    
  } catch (err) {
    console.error('Problem with removing volumes and images docker: ', err)
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
    .command('install <what>')
    .description(`Install template website ('site') or experiment ('experiment').`)
    .action((what) => {
      if (what == 'site' | what == 'experiment'){
        try {
          handleInstall(what)  
        } catch(e) {
          console.error(e)
          process.exit()
        }
      }else{
        console.error(`Command not recognized. Run 'pushkin --help' for help.`)
      }
    });

  program
    .command('aws <cmd>')
    .description(`For working with AWS. Commands include:\n 
      init: initialize an AWS deployment.\n 
      update: update an AWS deployment.\n
      armageddon: delete AWS resources created by Pushkin.\n
      list: list AWS resources created by Pushkin (and possibly others).`)
    .option('-f, --force', 'Applies only to init. Resets installation options. Does not delete AWS resources (for that, use aws armageddon).', false)
    .action(async (cmd, options) => {
      moveToProjectRoot();
      switch (cmd){
        case 'init':
          try {
            setEnv(false) //asynchronous
            await handleAWSInit(options.force);
          } catch(e) {
            console.error(e)
            process.exit();
          }
          break;
        case 'update':
          try {
            await handleAWSUpdate();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        case 'armageddon':
          try {
            await handleAWSArmageddon();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        case 'list':
          try {
            await handleAWSList();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        default: 
          console.error("Command not recognized. For help, run 'pushkin help aws'.")
      }
    });

  program
    .command('setDockerHub')
    .description(`Set (or change) your DockerHub ID. This must be run before deploying to AWS.`)
    .action(() => {
      moveToProjectRoot();
      inquirer.prompt([
          { type: 'input', name: 'ID', message: 'What is your DockerHub ID?'}
        ]).then(async (answers) => {
          let config
          try {
            config = await loadConfig(path.join(process.cwd(), 'pushkin.yaml'));
          } catch(e) {
            console.error(e)
            process.exit();
          }
          config.DockerHubID = answers.ID;
          try {
            fs.writeFileSync(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(config))
          } catch (e) {
            console.error('Unable to rewrite pushkin.yaml.')
            console.error(e)
            process.exit()
          }
        })
    })

  program
    .command('prep')
    .description('Prepares local copy for local testing. This step includes running migrations, so be sure you have read the documentation on how that works.')
    .option('-nm, --nomigrations', 'Do not run migrations. Be sure database structure has not changed!', false)
    .action(async (options) => {
      let awaits
      try{
        if (options.nomigrations){
          //only running prep
          awaits = [handlePrep()]
        } else {
          //running prep and updated DB
          awaits = [handlePrep(), handleUpdateDB()];
        }
      } catch (e) {
        console.error(e)
        process.exit();
      }
      return await Promise.all(awaits);
    })

  program
    .command('start')
    .description('Starts local deploy for debugging purposes. To start only the front end (no databases), see the manual.')
    .option('-nc, --nocache', 'Rebuild all images from scratch, without using the cache.', false)
    .action(async (options) => {
      moveToProjectRoot();
      try {
        console.log(`Setting front-end 'environment variable'`)
        setEnv(true) //this is synchronous
      } catch (e) {
        console.error(`Unable to update .env.js`)
      }
      try {
        fs.copyFileSync('pushkin/front-end/src/experiments.js', 'pushkin/front-end/experiments.js');
      } catch (e) {
        console.error("Couldn't copy experiments.js. Make sure it exists and is in the right place.")
        process.exit();
      }
      if (options.nocache){
        try {
          await compose.buildAll({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml', log: true, commandOptions: ["--no-cache"]})    
        } catch (e) {
          console.error("Problem rebuilding docker images");
          throw e;
        }
        compose.upAll({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml', log: true, commandOptions: ["--remove-orphans"]})
          .then(
            out => { 
              console.log(out.out, 'Starting. You may not be able to load localhost for a minute or two.')
            },
            err => { console.log('something went wrong:', err.message)}
          );
      } else {
        compose.upAll({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml', log: true, commandOptions: ["--build","--remove-orphans"]})
          .then(
            out => { console.log(out.out, 'Starting. You may not be able to load localhost for a minute or two.')},
            err => { console.log('something went wrong:', err.message)}
          );        
      }
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
      return;
    })

  program
    .command('config [what]')
    .description('View config file for `what`, with possible values being `site` or any of the installed experiments by name. Defaults to all.')
    .action((what) => {
      handleViewConfig(what)
    });


  program
    .command('utils <cmd>')
    .description(`Functions that are useful for backwards compatibility or debugging.\n
      updateDB: Updates test database. This is automatically run as part of 'pushkin prep'.\n
      setup-transaction-db: Creates a local transactions db. Useful for users of old site templates who wish to use CLI v2+.\n
      aws-auto-scale: Setups up default autoscaling for an AWS deploy. Normally run as part of 'aws init'.`)
    .action(async (cmd) => {
      moveToProjectRoot();
      switch (cmd){
        case 'updateDB':
          try {
            await handleUpdateDB();
          } catch(e) {
            console.error(e)
            process.exit();
          }
          break;
        case 'setup-transaction-db':
          try {
            await setupTestTransactionsDB();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        case 'aws-auto-scale':
          try {
            await handleCreateAutoScale();
          } catch(e) {
            console.error(e);
            process.exit();
          }
          break;
        default: 
          console.error("Command not recognized. For help, run 'pushkin help utils'.")
      }
    });

   program.parseAsync(process.argv);
}

main();
//program.parseAsync(process.argv);
 
