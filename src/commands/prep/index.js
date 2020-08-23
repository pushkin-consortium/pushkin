import path from 'path';
//import { promises as fs } from 'fs';
import fs from 'fs';
import jsYaml from 'js-yaml';
import util from 'util';
import { execSync } from 'child_process'; // eslint-disable-line
const exec = util.promisify(require('child_process').exec);
import pacMan from '../../pMan.js'; //which package manager is available?

// give package unique name, package it, npm install on installDir, return module name
const publishLocalPackage = async (modDir, modName) => {
  return new Promise((resolve, reject) => {
    const packageJsonPath = path.join(modDir, 'package.json');
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (e) {
      reject(new Error('Failed to parse package.json'.concat(e)))
    }
    let buildCmd
    if (packageJson.dependencies['build-if-changed'] == null) {
      console.log(modName, " does not have build-if-changed installed. Recommend installation for faster runs of prep.")
      buildCmd = pacMan.concat(' run build')
    } else {
      console.log("Using build-if-changed for ",modName)
      const pacRunner = (pacMan == 'yarn') ? 'yarn' : 'npx'
      buildCmd = pacRunner.concat(' build-if-changed')
    }
    console.log(`Installing dependencies for ${modDir}`);
    try {
      exec(pacMan.concat(' install --mutex network'), { cwd: modDir })
        .then(() => {
          console.log(`Building ${modName} from ${modDir}`);
          exec(buildCmd, { cwd: modDir })
            .then(() => {
              console.log(`${modName} is built`);
              exec('yalc publish --push', { cwd: modDir })
                .then(() => {
                  console.log(`${modName} is published locally via yalc`);
                  resolve(modName)
                })
            })
        })
    } catch (e) {
      console.error(`Problem updating ${modName}`)
      throw(e)
    }
  })
};


// prepare a single experiment's api controllers
const prepApi = async (expDir, controller) => {
  return new Promise((resolve, reject) => {
    const fullContrLoc = path.join(expDir, controller.location);
    console.log(`Started loading API controller for ${controller.mountPath}`);
    let moduleName;
    try {
      publishLocalPackage(fullContrLoc, controller.mountPath.concat('_api'))
    } catch (e) {
      console.error(`Problem publishing api for`.concat(controller.mountPath));
      throw e;
    }
    resolve(moduleName);
  })
}

// prepare a single experiment's web page
const prepWeb = async (expDir, expConfig, coreDir) => {
  const webPageLoc = path.join(expDir, expConfig.webPage.location);
  console.log(`Started loading web page for ${expConfig.shortName}`);
  let moduleName
  try {
    moduleName = await publishLocalPackage(webPageLoc, expConfig.shortName.concat('_web'))
  } catch (err) {
    console.error(`Failed on publishing web page: ${err}`);
    throw err;
  }
  console.log(`Loaded web page for ${expConfig.experimentName} (${moduleName})`);
  const modListAppendix = "{ fullName: `".concat(expConfig.experimentName).concat("`,") 
    .concat(`shortName: '${expConfig.shortName}', 
    module: ${moduleName}, logo: '${expConfig.logo}', 
    tagline: '${expConfig.tagline}', 
    duration: '${expConfig.duration}', 
    text: '${expConfig.text}' }`);

  // move logo to assets folder
  fs.promises.copyFile(path.join(webPageLoc, 'src/assets', expConfig.logo), path.join(coreDir, 'front-end/src/assets/images/quiz/', expConfig.logo))
    .catch((e) => {
      console.error(`Problem copying logo file for `, expConfig.shortName);
      throw(e);
    })

  console.log(`Added ${expConfig.experimentName} to experiments.js`)
  return { moduleName, listAppendix: modListAppendix };
};

export const readConfig = (expDir) => {
  const expConfigPath = path.join(expDir, 'config.yaml');
  try {
    return jsYaml.safeLoad(fs.readFileSync(path.join(expDir, 'config.yaml')));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error('File not found!');
    }
    throw err
  }
}

// the main prep function for prepping all experiments
export default async (experimentsDir, coreDir) => {

  console.log("package manager: ",pacMan);

  const cleanWeb = async (coreDir) => {
    console.log(`resetting experiments.js`); 
    try {
      if (fs.existsSync(path.join(coreDir, 'front-end/experiments.js'))) {
        //These extra experiments.js files are created when doing a local test deploy
        //If it doesn't exist, that's just fine
        fs.unlinkSync(path.join(coreDir, 'front-end/experiments.js'));
        console.log("Cleaned up front-end/experiments.js")        
      }
    } catch (e) {
      console.error(e)
    }
    const webPageAttachListFile = path.join(coreDir, 'front-end/src/experiments.js');
    let cleanedWeb
    try {
      cleanedWeb = fs.promises.writeFile(path.join(coreDir, 'front-end/src/experiments.js'), `[]`, 'utf8')      
    } catch (e) {
      console.error('Problem overwriting experiments.js')
      throw e
    }
    return cleanedWeb;
  }

  let cleanedWeb
  try {
    cleanedWeb = cleanWeb(coreDir);
  } catch (e) {
    throw e
  }

  const prepAPIWrapper = (exp) => {
    console.log(`Started prepping API for`, exp);
    return new Promise((resolve, reject) => {
      const expDir = path.join(experimentsDir, exp)
      if (!fs.lstatSync(expDir).isDirectory()) resolve('');
      let expConfig;
      try {
        expConfig = readConfig(expDir);
      } catch (err) {
        console.error(err);
        reject(new Error(`Failed to read experiment config file for `.concat(exp).concat(err)))
      }
      let preppedApi;
      try {
        preppedApi = prepApi(expDir, expConfig.apiControllers);
      } catch (err) {
        console.error('Something wrong with prepping API', err)
        reject(new Error(`Unable to prep api for `.concat(exp)))
      }
      resolve(preppedApi)
    })
  }

  const expDirs = fs.readdirSync(experimentsDir);
  let preppedAPI;
  try {
    preppedAPI = Promise.all(expDirs.map(prepAPIWrapper))
  } catch (err) {
    console.error(err);
    process.exit();
  }
  
  const installAndBuild = async (where) =>
  {
    let returnVal
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(path.join(where,'package.json'), 'utf8'));
    } catch (e) {
      console.error('Failed to parse package.json')
      throw e
    }
    try {
      if (packageJson.dependencies['build-if-changed'] == null) {
        console.log(where, " does not have build-if-changed installed. Recommend installation for faster runs of prep.")
        execSync(pacMan.concat(' run build'), { cwd: where })
      } else {
        console.log("Using build-if-changed for", where)
        const pacRunner = (pacMan == 'yarn') ? 'yarn' : 'npx'
        returnVal = exec(pacRunner.concat(' build-if-changed'), {cwd: where}).toString()
        console.log(returnVal);
        if (returnVal.search("No changes")>0) {
          console.log("No changes. Building not necessary.")
        } else {
          console.log("rebuilt ", where)
         }
      }           
    } catch (err) {
      throw err
    }
    return returnVal
  }

  const prepWebWrapper = (exp) => {
    console.log(`Started prepping web page for`, exp);
    return new Promise((resolve, reject) => {
      const expDir = path.join(experimentsDir, exp)
      if (!fs.lstatSync(expDir).isDirectory()) resolve('');
      let expConfig;
      try {
        expConfig = readConfig(expDir);
      } catch (err) {
        console.error(err);
        reject(new Error(`Failed to read experiment config file for `.concat(exp).concat(err)))
      }
      let webPageIncludes;
      try {
        webPageIncludes = prepWeb(expDir, expConfig, coreDir)
      } catch (err) {
        reject(new Error(`Unable to prep web page for `.concat(exp)))
      }
      resolve(webPageIncludes)
    })
  }

  let webPageIncludes;
  try {
    webPageIncludes = Promise.all(expDirs.map(prepWebWrapper))
  } catch (err) {
    console.error(err);
    process.exit();
  }


  const prepWorkerWrapper = async (exp) => {
    console.log(`Building worker for`, exp);
    const expDir = path.join(experimentsDir, exp)
    if (!fs.lstatSync(expDir).isDirectory()) resolve('');
    let expConfig;
    try {
      expConfig = readConfig(expDir);
    } catch (err) {
      console.error(`Failed to read experiment config file for `.concat(exp));
      throw err;
    }
    const workerConfig = expConfig.worker;
    const workerName = `${exp}_worker`.toLowerCase(); //Docker names must all be lower case
    const workerLoc = path.join(expDir, workerConfig.location);

    let AMQP_ADDRESS
    // Recall, compFile is docker-compose.dev.yml, and is defined outside this function.
    try {
      Object.keys(compFile.services[workerName].environment).forEach((e) => {
        if (compFile.services[workerName].environment[e].includes("AMQP_ADDRESS")) { 
          AMQP_ADDRESS = compFile.services[workerName].environment[e].split("=")[1] 
        }
      }) 
    } catch (e) {
      console.error(`Problem with updating environment variables for ${workerName}`)
      console.error(`Value of service ${workerName} in docker-compose.dev.yml:\n ${JSON.stringify(compFile.services[workerName])}`)
      throw e
    }   

    compFile.services[workerName].environment = {} 
    compFile.services[workerName].environment.AMQP_ADDRESS = AMQP_ADDRESS || 'amqp://message-queue:5672'
    compFile.services[workerName].environment.DB_USER = pushkinYAML.databases.localtestdb.user
    compFile.services[workerName].environment.DB_PASS = pushkinYAML.databases.localtestdb.pass
    compFile.services[workerName].environment.DB_URL = pushkinYAML.databases.localtestdb.url
    compFile.services[workerName].environment.DB_NAME = pushkinYAML.databases.localtestdb.name

    let workerBuild
    try {
      console.log(`Building docker image for ${workerName}`)
      workerBuild = exec(`docker build ${workerLoc} -t ${workerName}`)
    } catch(e) {
      console.error(`Problem building worker for ${exp}`)
      throw (e)
    }
    return workerBuild;
  }

  const composeFileLoc = path.join(path.join(process.cwd(), 'pushkin'), 'docker-compose.dev.yml');
  const pushkinYAMLFileLoc = path.join(process.cwd(), 'pushkin.yaml')
  let compFile;
  let pushkinYAML;
  try { 
    compFile = jsYaml.safeLoad(fs.readFileSync(composeFileLoc), 'utf8'); 
    pushkinYAML = jsYaml.safeLoad(fs.readFileSync(pushkinYAMLFileLoc), 'utf8'); 
    console.log('loaded docker-compose.dev.yml and pushkin.yaml.')
  } catch (e) { 
    console.error('Failed to load either pushkin.yaml or docker-compose.dev.yml or both.');
    throw e
  }

  let preppedWorkers;
  try {
    preppedWorkers = Promise.all(expDirs.map(prepWorkerWrapper))
  } catch (err) {
    console.error(err);
    throw(err);
  }

  const tempAwait = await Promise.all([webPageIncludes, preppedAPI, cleanedWeb])

  // Deal with Web page includes
  let finalWebPages = tempAwait[0]
  let top
  let bottom
  let toWrite
  try {
    console.log("Writing out experiments.js")
    top = finalWebPages.map((include) => {return `import ${include.moduleName} from '${include.moduleName}';\n`})
    top = top.join('')
    bottom = finalWebPages.map((include) => {return `${include.listAppendix}\n`}).join(',')
    toWrite = top.concat(`export default [\n`).concat(bottom).concat(`];`)
    fs.writeFileSync(path.join(coreDir, 'front-end/src/experiments.js'), toWrite, 'utf8')
  } catch (e) { 
    console.error('Failed to include web pages in front end');
    throw e; 
  }

  //Finally, install pushkin/api and pushkin/front-end
  //Note that this cannot run until the individual apis and webpages for all experiments have been rebuilt
  //Nothing depends on the workers, though, so we can defer that await until later
  let installedApi
  try {
    console.log("Installing combined API")
    installedApi = exec(pacMan.concat(' install'), { cwd: path.join(coreDir, 'api') }).then(console.log("Installed combined API"))
  } catch (err) {
    console.error('Problem installing and buiding combined API')
    throw err
  }
  let installedWeb;
  try {
    console.log("Installing combined front-end")
    installedWeb = exec(pacMan.concat(' install'), { cwd: path.join(coreDir, 'front-end') }).then(console.log("Installed combined front-end"))
  } catch (err) {
    console.error('Problem installing and buiding combined front-end')
    throw err
  }

  await preppedWorkers
  console.log('Finished building all experiment workers')
  try {
    console.log(`updating docker-compose.dev.yml`)
    fs.writeFileSync(composeFileLoc, jsYaml.safeDump(compFile), 'utf8');
  } catch (e) { 
    console.error('Failed to create new compose file', e); 
    process.exit()
  }


  return Promise.all([installedApi, installedWeb]);
};
