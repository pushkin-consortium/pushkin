import path from 'path';
//import { promises as fs } from 'fs';
import fs from 'fs';
import jsYaml from 'js-yaml';
import util from 'util';
import { execSync } from 'child_process'; // eslint-disable-line
const exec = util.promisify(require('child_process').exec);
import setupdb from '../setupdb/index.js';
import pacMan from '../../pMan.js'; //which package manager is available?

// give package unique name, package it, npm install on installDir, return module name
const publishLocalPackage = async (modDir, modName) => {
  return new Promise((resolve, reject) => {
    console.log('modDir: ', modDir)
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
      exec(pacMan.concat(' install'), { cwd: modDir })
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
      moduleName = publishLocalPackage(fullContrLoc, controller.mountPath.concat('_api'))
    } catch (e) {
      console.error(`Problem publishing api for`.concat(controller.mountPath));
      throw e;
    }
    return moduleName;
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
  console.log(`Loaded web page for ${expConfig.shortName} (${moduleName})`);
  // this must be one line
  const modListAppendix = `{ fullName: '${expConfig.experimentName}', 
    shortName: '${expConfig.shortName}', 
    module: ${moduleName}, logo: '${expConfig.logo}', 
    tagline: '${expConfig.tagline}', 
    duration: '${expConfig.duration}', 
    text: '${expConfig.text}' }`;
  // move logo to assets folder

  fs.promises.copyFile(path.join(webPageLoc, 'src/assets', expConfig.logo), path.join(coreDir, 'front-end/src/assets/images/quiz/', expConfig.logo))
    .catch((e) => {
      console.error(`Problem copying logo file for `, expConfig.shortName);
      throw(e);
    })

  return { moduleName, listAppendix: modListAppendix };
};

export const readConfig = (expDir) => {
  const expConfigPath = path.join(expDir, 'config.yaml');
  try {
    return jsYaml.safeLoad(fs.readFileSync(path.join(expDir, 'config.yaml')));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('File not found!');
    }
    throw err
  }
}

// the main prep function for prepping all experiments
export default async (experimentsDir, coreDir) => {

  console.log("package manager: ",pacMan);

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
  let contrListAppendix;
  try {
    contrListAppendix = Promise.all(expDirs.map(prepAPIWrapper))
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
      if (pacMan == 'yarn') {
        await exec(pacMan.concat(' add ./tempPackages/*'), {cwd: where})
      } else {
        await exec(pacMan.concat(' install ./tempPackages/*'), {cwd: where})        
      }
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
      let WebPageIncludes;
      try {
        WebPageIncludes = prepWeb(expDir, expConfig, coreDir)
      } catch (err) {
        reject(new Error(`Unable to prep web page for `.concat(exp)))
      }
      resolve(WebPageIncludes)
    })
  }

  let webPageIncludes;
  try {
    WebPageIncludes = Promise.all(expDirs.map(prepWebWrapper))
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
    return exec(`docker build ${workerLoc} -t ${workerName}`);
  }

  let WorkerIncludes;
  try {
    WorkerIncludes = Promise.all(expDirs.map(prepWorkerWrapper))
  } catch (err) {
    console.error(err);
    process.exit();
  }

  const tempAwait = await Promise.all([WorkerIncludes, WebPageIncludes, contrListAppendix])

  // Deal with Web page includes
  let finalWebPages = tempAwait[1]
  let top
  let bottom
  let toWrite
  try {
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
  //Note that this cannot run until the individual experiments have been rebuilt
  let installedApi
  try {
    installedApi = exec(pacMan.concat(' install'), { cwd: path.join(coreDir, 'api') })
  } catch (err) {
    console.error('Problem installing and buiding combined API')
    throw err
  }
  let installedWeb;
  try {
    installedWeb = exec(pacMan.concat(' install'), { cwd: path.join(coreDir, 'front-end') })
  } catch (err) {
    console.error('Problem installing and buiding combined front-end')
    throw err
  }

  return await Promise.all([installedApi, installedWeb]);
};
