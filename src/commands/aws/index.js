import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';

export async function awsInit(shortName) {
  return '';
}


export async function nameProject(projName) {
  let awsConfig = {}
  awsConfig.name = projName;
  awsConfig.awsName = projName.replace(/[^\w\s]/g, "").replace(/ /g,"_").concat(uuid())
  try {
    fs.writeFileSync(path.join(process.cwd(), 'awsConfig.js'), JSON.stringify(awsConfig), 'utf8');
  } catch(e) {
    console.error(`Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  return awsConfig.awsName
}

