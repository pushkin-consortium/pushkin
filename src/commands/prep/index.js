import path from 'path';
//import { promises as fs } from 'fs';
import fs from 'fs';
import jsYaml from 'js-yaml';
import uuid from 'uuid/v4';
import util from 'util';
import { execSync } from 'child_process'; // eslint-disable-line
const exec = util.promisify(require('child_process').exec);

// give package unique name, package it, npm install on installDir, return module name
const packAndInstall = async (packDir, installDir, packName) => {
  return new Promise((resolve, reject) => {
    // backup the package json
    console.log('packDir: ', packDir)
    const packageJsonPath = path.join(packDir, 'package.json');
    const packageJsonBackup = path.join(packDir, 'package.json.bak');
    try { 
      fs.copyFileSync(packageJsonPath, packageJsonBackup); 
    } catch (e) { 
      reject(new Error('Failed to backup package.json'.concat(e))); 
    }
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (e) {
      reject(new Error('Failed to parse package.json'.concat(e)))
    }
    packageJson.name = packName;
    try {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson), 'utf8')
    } catch (e) {
      reject(new Error('Failed to rewrite package.json'.concat(e)))
    }

    // package it up in tarball
    let stdout
    try {
      execSync('npm install', { cwd: packDir })
      execSync('npm run build', { cwd: packDir })
      stdout = execSync('npm pack', { cwd: packDir })
    } catch (e) {
      reject(new Error('Failed to build and pack'.concat(packName).concat(e)))
    }
    console.log('Built package for ', packName)
    console.log('stdout: ', stdout.toString().trim())
    const packedFileName = stdout.toString().trim();
    const packedFile = path.join(packDir, packedFileName);
    const movePack = path.join(installDir, packName.concat('.tgz'));
    try {
      fs.renameSync(packedFile, movePack)
      fs.unlinkSync(packageJsonPath)
      fs.renameSync(packageJsonBackup, packageJsonPath)
    } catch (e) {
      reject(new Error('Ran into issues moving the packages for'.concat(packName).concat(e)))
    }

    console.log('Finished packing up', packName)
    resolve(packName)
  })
};


// sketchy method to handle writing pure js for static imports
const includeInModuleList = (importName, listAppendix, file) => { // eslint-disable-line
  const data = fs.readFileSync(file, 'utf8').trim();
  const lineSplit = data.split('\n');
  const allButEnd = lineSplit.slice(0, lineSplit.length - 1);
  const newData = `import ${importName} from '${importName}';
${allButEnd.join('\n')}
	${listAppendix},
];`;
  fs.writeFileSync(file, newData, 'utf8');
};


async function cleanUpFiles(coreDir) {
  // reset controllers, web pages, workers to be included in main build

  console.log('loading files...')

  const apiPackages = await fs.promises.readdir(path.join(coreDir, 'api/tempPackages'))
    .catch((e) => {
      console.error(`Failed to find api/tempPackages`, e);
      process.exit()
    })
  const webPackages = await fs.promises.readdir(path.join(coreDir, 'front-end/tempPackages'))
    .catch((e) => {
      console.error(`Failed to find front-end/tempPackages`, e);
      process.exit()
    })
  const controllersJsonFile = await fs.promises.readFile(path.join(coreDir, 'api/src/controllers.json'))
    .catch((e) => {
      console.error('Failed to load api/src/controllers.json', e);
      process.exit()
    })
  const webPageAttachListFile = path.join(coreDir, 'front-end/src/experiments.js');
  const data = await fs.promises.readFile(webPageAttachListFile, 'utf8')
    .catch((e) => {
      console.error(`Failed to load ${webPageAttachListFile}`, e);
      process.exit()
    })
  await Promise.all([apiPackages, webPackages, controllersJsonFile, data]);

  // reset api controllers
  console.log('reading controllersJsonFile')
  const oldContrList = JSON.parse(controllersJsonFile);
  const cleanAPI = async (contr) => {
    const moduleName = contr.name;
    console.log(`Cleaning API controller ${contr.mountPath} (${moduleName})`);  
    return exec(`npm uninstall ${moduleName} --save`, { cwd: path.join(coreDir, 'api') }).catch((err) => console.error(err))  
  }
  const cleanedAPI = oldContrList.map(cleanAPI); //https://stackoverflow.com/questions/31413749/node-js-promise-all-and-foreach

  // reset web page dependencies
  let oldPages = [];
    data.trim().split('\n').forEach((line) => {
      const spaces = line.split(' ');
      if (spaces[0] == 'import') oldPages.push(spaces[1]);
    });
  const cleanWeb = async (pageModule) => {
    console.log(`Cleaning web page (${pageModule})`); 
    return exec(`npm uninstall ${pageModule} --save`, { cwd: path.join(coreDir, 'front-end') }).catch((err) => console.error(err))  
  }
  const cleanedWeb = oldPages.map(cleanWeb); //https://stackoverflow.com/questions/31413749/node-js-promise-all-and-foreach


  // remove tgz package files
  console.log('Cleaning temporary files');
  const cleanPackages = async (dir, tempPackage) => {
    const maybeFile = path.join(dir, tempPackage);
    return fs.lstatSync(maybeFile).isFile() ? 
      fs.promises.unlink(maybeFile).catch((err) => console.error(`Problem removing old temporary file ${maybeFile}`, err)) :
      new Promise((resolve, reject) => resolve('NA'))
  }
  const cleanedAPIPackages = apiPackages.map((x) => cleanPackages(path.join(coreDir, 'api/tempPackages'),x));
  const cleanedWebPackages = webPackages.map((x) => cleanPackages(path.join(coreDir, 'front-end/tempPackages'),x));

  // used to remove workers from main docker compose file
  // I don't think this goes here anymore. Only needed for actually deleting an experiment.

  const writeAPI = fs.promises.writeFile(controllersJsonFile, JSON.stringify([]), 'utf8').catch((err) => console.error(err))
  const writeWeb = fs.promises.writeFile(webPageAttachListFile, 'export default [\n];', 'utf8').catch((err) => console.error(err))
  return await Promise.all([cleanedAPI, cleanedWeb, cleanedAPIPackages, cleanedWebPackages, writeAPI, writeWeb]);
};


// prepare a single experiment's api controllers
const prepApi = async (expDir, controllerConfigs, coreDir) => {
  return Promise.all(controllerConfigs.map(async (controller) => {
    const fullContrLoc = path.join(expDir, controller.location);
    console.log(`Started loading API controller for ${controller.mountPath}`);
    let moduleName;
    try {
      moduleName = await packAndInstall(fullContrLoc, path.join(coreDir, 'api/tempPackages'), controller.mountPath.concat('_api'))
    } catch (e) {
      console.error(`Problem packing and installing api for`.concat(controller.mountPath));
      throw e;
    }
    return ({ name: moduleName, mountPath: controller.mountPath });
  }))
}

// prepare a single experiment's web page
const prepWeb = async (expDir, expConfig, coreDir) => {
  const webPageLoc = path.join(expDir, expConfig.webPage.location);
  console.log(`Started loading web page for ${expConfig.shortName}`);
  let moduleName
  try {
    moduleName = await packAndInstall(webPageLoc, path.join(coreDir, 'front-end/tempPackages'), expConfig.shortName.concat('_web'))
  } catch (err) {
    console.error(`Failed on prepping web page: ${err}`);
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
  return { moduleName, listAppendix: modListAppendix };
};

const readConfig = (expDir) => {
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

  console.log('Cleaning up old experiments');
  try {
    let cleanCore = await cleanUpFiles(coreDir); 
  } catch (e) {
    console.error(`Problem cleaning old files:`, e);
    process.exit();
  }
  console.log(`Cleaned up old experiments.`)

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
        preppedApi = prepApi(expDir, expConfig.apiControllers, coreDir);
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
    try {
      await exec('npm install *', {cwd: path.join(where, 'tempPackages')})
      returnVal = exec('npm run build', {cwd: where})
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

  let WebPageIncludes;
  try {
    WebPageIncludes = Promise.all(expDirs.map(prepWebWrapper))
  } catch (err) {
    console.error(err);
    process.exit();
  }

  const prepWorkerWrapper = async (exp) => {
    console.log(`Started prepping worker for`, exp);
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
    const workerService = workerConfig.service;
    const workerName = `pushkinworker_${exp}`.toLowerCase(); //Docker names must all be lower case
    const workerLoc = path.join(expDir, workerConfig.location);
    const serviceContent = { ...workerService, image: workerName };
    serviceContent.labels = { ...(serviceContent.labels || {}), isPushkinWorker: true };
    await exec(`docker build ${workerLoc} -t ${workerName}`);
    console.log( `Build image for worker `,exp)
    return { serviceName: workerName, serviceContent };
  }

  let WorkerIncludes;
  try {
    WorkerIncludes = Promise.all(expDirs.map(prepWorkerWrapper))
  } catch (err) {
    console.error(err);
    process.exit();
  }

  const tempAwait = await Promise.all([WorkerIncludes, WebPageIncludes, contrListAppendix])
  console.log('tempAwait: ',tempAwait)
  let finalWorkers = tempAwait[0]
  let finalWebPages = tempAwait[1]
  let finalControllers = tempAwait[2].map((c) => c[0]);

  //Handle API includes
  console.log('API controllers list: ', finalControllers);
  try {
    fs.writeFileSync(path.join(coreDir, 'api/src/controllers.json'), JSON.stringify(finalControllers), 'utf8')
  } catch (err) {
    console.error(`Failed to write api controllers list`)
    throw err;
  }

  let installedApi
  try {
    installedApi = installAndBuild(path.join(coreDir, 'api'));
  } catch (err) {
    console.error('Problem installing and buiding combined API')
    throw err
  }

  // Deal with Web page includes
  console.log('Web pages list: ', finalWebPages);
  let top
  let bottom
  let toWrite
  try {
    top = finalWebPages.map((include) => {return `import ${include.moduleName} from '${include.moduleName}';\n`})
    top = top.join('')
    console.log('top: ',top)
    bottom = finalWebPages.map((include) => {return `${include.listAppendix}\n`}).join(',')
    console.log('bottom: ', bottom)
    toWrite = top.concat(`export default [\n`).concat(bottom).concat(`];`)
    console.log('to write: ', toWrite)
    fs.writeFileSync(path.join(coreDir, 'front-end/src/experiments.js'), toWrite, 'utf8')
  } catch (e) { 
    console.error('Failed to include web pages in front end');
    throw e; 
  }

  let installedWeb;
  try {
    installedWeb = installAndBuild(path.join(coreDir, 'front-end'));
  } catch (err) {
    console.error('Problem installing and buiding combined front-end')
    throw err
  }

  // write out new compose file with worker services
  console.log('Workers list: ', finalWorkers);
  const composeFileLoc = path.join(coreDir, 'docker-compose.dev.yml');
  let compFile;
  try { 
    compFile = jsYaml.safeLoad(fs.readFileSync(composeFileLoc), 'utf8'); 
  } catch (e) { 
    console.error('Failed to load main docker compose file: ',e);
    process.exit() 
  }
  finalWorkers.forEach((workService) => {
    compFile.services[workService.serviceName] = workService.serviceContent;
  });
  let newCompData;
  try { 
    fs.writeFileSync(composeFileLoc, jsYaml.safeDump(compFile), 'utf8');
  } catch (e) { 
    console.error('Failed to create new compose file', e); 
    process.exit()
  }

  return await Promise.all([installedApi, installedWeb])
};
