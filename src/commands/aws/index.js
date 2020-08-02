import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import util from 'util';
import pacMan from '../../pMan.js'; //which package manager is available?
import { execSync } from 'child_process'; // eslint-disable-line
import { policy, cloudfront } from './awsConfigs.js'
const exec = util.promisify(require('child_process').exec);

const buildFE = function (projName) {
  return new Promise ((resolve, reject) => {
    //can we use build-if-changed?
    console.log("Building front-end")
    const packageJsonPath = path.join(process.cwd(), 'pushkin/front-end/package.json');
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (e) {
      console.error('Failed to parse front-end package.json')
      throw e
    }
    let buildCmd
    if (packageJson.dependencies['build-if-changed'] == null) {
      console.log(modName, " does not have build-if-changed installed. Recommend installation for faster runs of prep.")
      buildCmd = pacMan.concat(' run build')
    } else {
      console.log("Using build-if-changed for ",projName)
      const pacRunner = (pacMan == 'yarn') ? 'yarn' : 'npx'
      buildCmd = pacRunner.concat(' build-if-changed')
    }
    let builtWeb
    try {
      console.log("Building combined front-end")
      builtWeb = exec(buildCmd, { cwd: path.join(process.cwd(), 'pushkin/front-end') }).then(console.log("Installed combined front-end"))
    } catch (err) {
      console.error('Problem installing and buiding combined front-end')
      throw err
    }
    resolve(builtWeb)
  })
}


export async function awsInit(projName, awsName, useIAM) {
  console.log("cloudfront:", cloudfront)
  console.log(cloudfront.CallerReference)
  console.log(cloudfront.DefaultCacheBehavior.TargetOriginId)
  console.log(cloudfront.Origins.Items[0])
  console.log(cloudfront.Origins.Items[0].Id)
  console.log(cloudfront.Origins.Items[0].DomainName)

  //build front-end
  let builtWeb
  try {
    builtWeb = buildFE(projName)
  } catch(e) {
    throw e
  }

  console.log("Creating s3 bucket")
  try {
    execSync(`aws s3 mb s3://`.concat(awsName).concat(` --profile `).concat(useIAM))
  } catch(e) {
    console.error('Problem creating bucket for front-end')
    throw e
  }

  await builtWeb; //need this before we sync! 

  console.log("Copying files to bucket")
  try {
    execSync(`aws s3 sync build/ s3://${awsName} --profile ${useIAM}`, {cwd: path.join(process.cwd(), 'pushkin/front-end')})
  } catch(e) {
    console.error(`Unable to sync local build with s3 bucket`)
    throw e
  }

  console.log("Setting permissions")
  policy.Statement[0].Resource = "arn:aws:s3:::".concat(awsName).concat("/*")
  try {
    execSync(`aws s3 website s3://${awsName} --profile ${useIAM} --index-document index.html --error-document index.html`)
    execSync(`aws s3api put-bucket-policy --bucket `.concat(awsName).concat(` --policy '`).concat(JSON.stringify(policy)).concat(`' --profile ${useIAM}`))
  } catch (e) {
    console.error('Problem setting bucket permissions for front-end')
    throw e
  }

  console.log("Deploy to CloudFront")
  cloudfront.CallerReference = awsName;
  cloudfront.DefaultCacheBehavior.TargetOriginId = awsName;
  cloudfront.Origins.Items[0].Id = awsName;
  cloudfront.Origins.Items[0].DomainName = awsName.concat('.s3.amazonaws.com');
  try {
    execSync(`aws cloudfront create-distribution --distribution-config '`.concat(JSON.stringify(cloudfront)).concat(`' --profile ${useIAM}`))
  } catch (e) {
    console.log('Could not set up cloudfront.')
    throw e
  }
}


export async function nameProject(projName) {
  let awsConfig = {}
  awsConfig.name = projName;
  awsConfig.awsName = projName.replace(/[^\w\s]/g, "").replace(/ /g,"-").concat(uuid()).toLowerCase();
  try {
    fs.writeFileSync(path.join(process.cwd(), 'awsConfig.js'), JSON.stringify(awsConfig), 'utf8');
  } catch(e) {
    console.error(`Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  return awsConfig.awsName
}

export async function addIAM(iam) {
  let awsConfig
  try {
    awsConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'awsConfig.js'), awsConfig, 'utf8'));
  } catch(e) {
    console.error(`Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  awsConfig.iam = iam;
  console.log(awsConfig)
  try {
    fs.writeFileSync(path.join(process.cwd(), 'awsConfig.js'), JSON.stringify(awsConfig), 'utf8');
  } catch(e) {
    console.error(`Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  return
}

