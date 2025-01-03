import { v4 as uuid } from 'uuid';
import fs from 'graceful-fs';
import path from 'path';
import util from 'util';
import pacMan from '../../pMan.js'; //which package manager is available?
import { execSync } from 'child_process'; // eslint-disable-line
import jsYaml from 'js-yaml';
import { pushkinACL, OriginAccessControl, policy, cloudFront, dbConfig, rabbitTask, apiTask, workerTask, changeSet, corsPolicy, disableCloudfront, alarmRAMHigh, alarmCPUHigh, alarmRDSHigh, scalingPolicyTargets } from './awsConfigs.js'
import { migrateTransactionsDB, runMigrations, getMigrations } from '../setupdb/index.js';
import { updatePushkinJs, readConfig } from '../prep/index.js'
import inquirer from 'inquirer'
import { kill } from 'process';
const crypto = require('crypto');

const exec = util.promisify(require('child_process').exec);
const mkdir = util.promisify(require('fs').mkdir);

const publishToDocker = async (DHID, rebuiltWorkers) => {
  console.log('Publishing images to DockerHub')
  console.log("Building API")
  try {
    execSync(`docker buildx build --platform linux/amd64 -t ${DHID}/api:latest pushkin/api --load`, {cwd: process.cwd()})
  } catch(e) {
    console.error(`Problem building API`)
    throw e
  }
  console.log("Pushing API to DockerHub")
  let pushedAPI
  try {
    pushedAPI = exec(`docker push ${DHID}/api:latest`, {cwd: process.cwd()})
  } catch(e) {
    console.error(`Couldn't push API to DockerHub`)
    throw e
  }

  //note: don't need to rebuild server, because we use S3
  let docker_compose
  try {
    docker_compose = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'), 'utf8'));
  } catch(e) {
    console.error('Failed to load the docker-compose. That is extremely odd.')
    throw e
  }

  const pushWorkers = async (s) => {
    const service = docker_compose.services[s]
    if (service.labels == null) {
      // not a worker
      return ''
    }
    if (service.labels.isPushkinWorker != true) {
      // not a worker
      return ''
    }

    console.log(`Pushkin ${s}`)
    try {
      execSync(`docker tag ${service.image} ${DHID}/${service.image}:latest`)
    } catch(e) {
      console.error(`Unable to tag image ${service.image}`)
      throw e
    }
    try {
      return exec(`docker push ${DHID}/${service.image}`)
    } catch(e) {
      throw e
    }
  }

  rebuiltWorkers = await rebuiltWorkers; //can't push until these are built

  let pushedWorkers
  try {
    pushedWorkers = Object.keys(docker_compose.services).map(pushWorkers)
  } catch (e) {
    throw e
  }
  
  return Promise.all([pushedAPI, pushedWorkers])
}

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
      buildCmd = pacMan.concat(' --mutex network run build')
    } else {
      console.log("Using build-if-changed for", projName)
      const pacRunner = (pacMan == 'yarn') ? 'yarn' : 'npx'
      buildCmd = pacRunner.concat(' build-if-changed --mutex network')
    }
    let builtWeb
    console.log("Building combined front-end")
    try {
      builtWeb = exec(buildCmd, { cwd: path.join(process.cwd(), 'pushkin/front-end') })
      .then(() => {
        console.log("Installed combined front-end")
        resolve(builtWeb)
      })
    } catch (error) {
      console.error('Problem installing and buiding combined front-end')
      console.error(error)
      process.exit()
    }
  })
}

export const syncS3 = async (awsName, useIAM) => {
  console.log("Syncing files to bucket")
  try {
    return exec(`aws s3 sync build/ s3://${awsName} --profile ${useIAM}`, {cwd: path.join(process.cwd(), 'pushkin/front-end')})
  } catch(e) {
    console.error(`Unable to sync local build with s3 bucket`)
    throw e
  }  
}

const makeRecordSet = async (myDomain, useIAM, projName, theCloud) => {
  console.log(`Retrieving hostedzone ID for ${myDomain}`)
  let zoneID, temp
  try {
    temp = await exec(`aws route53 list-hosted-zones-by-name --dns-name ${myDomain} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to retrieve hostedzone for ${myDomain}`)
    throw e
  }
  if (JSON.parse(temp.stdout).HostedZones.length == 0) {
    console.error(`No hostedzone found for ${myDomain}`)
    throw new Error(`No hostedzone found for ${myDomain}`)
  }
  try {
    zoneID = JSON.parse(temp.stdout).HostedZones[0].Id.split("/hostedzone/")[1]
  } catch (e) {
    console.error(`Unable to parse hostedzone for ${myDomain}`)
    throw e
  }

  let recordSet = {
    "Comment": "",
    "Changes": []
  }
  recordSet.Changes[0] = JSON.parse(JSON.stringify(changeSet));
  recordSet.Changes[1] = JSON.parse(JSON.stringify(changeSet));
  recordSet.Changes[2] = JSON.parse(JSON.stringify(changeSet));
  recordSet.Changes[3] = JSON.parse(JSON.stringify(changeSet));

  recordSet.Changes[0].ResourceRecordSet.Name = myDomain
  recordSet.Changes[0].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
  recordSet.Changes[0].ResourceRecordSet.Type = "A"
  recordSet.Changes[0].ResourceRecordSet.SetIdentifier = projName

  recordSet.Changes[1].ResourceRecordSet.Name = myDomain
  recordSet.Changes[1].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
  recordSet.Changes[1].ResourceRecordSet.Type = "AAAA"
  recordSet.Changes[1].ResourceRecordSet.SetIdentifier = projName

  recordSet.Changes[2].ResourceRecordSet.Name = "www.".concat(myDomain) //forward from www
  recordSet.Changes[2].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
  recordSet.Changes[2].ResourceRecordSet.Type = "A"
  recordSet.Changes[2].ResourceRecordSet.SetIdentifier = projName

  recordSet.Changes[3].ResourceRecordSet.Name = "www.".concat(myDomain) //forward from www
  recordSet.Changes[3].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
  recordSet.Changes[3].ResourceRecordSet.Type = "AAAA"
  recordSet.Changes[3].ResourceRecordSet.SetIdentifier = projName

  let returnVal

  // if there was a failed init, there may already be resource record sets
  // which will cause this to fail. So, we'll try to delete them first.
  let existingRecords
  try {
    existingRecords = await exec(`aws route53 list-resource-record-sets --hosted-zone-id ${zoneID} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to list resource record sets for ${myDomain}`)
    throw e
  }
  if (JSON.parse(existingRecords.stdout).ResourceRecordSets.length > 0) {
    console.log(`Deleting existing resource record sets for ${myDomain}`)
    try {
      await exec(`aws route53 change-resource-record-sets --hosted-zone-id ${zoneID} --change-batch '{ "Changes": [ { "Action": "DELETE", "ResourceRecordSet": ${JSON.stringify(JSON.parse(existingRecords.stdout).ResourceRecordSets)} } ] }' --profile ${useIAM}`)
    } catch (e) {
      console.error(`Unable to delete resource record sets for ${myDomain}`)
    }
  }

  const waitForRecordSetDeletion = async (zoneID, useIAM) => {
    let existingRecords
    while (true) {
      try {
        existingRecords = await exec(`aws route53 list-resource-record-sets --hosted-zone-id ${zoneID} --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to list resource record sets for ${zoneID}`)
        throw e
      }

      
      if (JSON.parse(existingRecords.stdout).ResourceRecordSets.map((r) => {
        if (r.SetIdentifier) {
          console.log(`found SetIdentifier ${r.SetIdentifier} for ${r.Name}, ${r.Type}`)
          //try deleting this record set
          try {
            execSync(`aws route53 change-resource-record-sets --hosted-zone-id ${zoneID} --change-batch '{ "Changes": [ { "Action": "DELETE", "ResourceRecordSet": ${JSON.stringify(r)} } ] }' --profile ${useIAM}`)
          } catch (e) {
            console.error(`Unable to delete resource record set ${r.SetIdentifier} for ${zoneID}`)
            console.error(e)
          }
          return true
        } else {
          console.log(`No SetIdentifier ${r.SetIdentifier} for ${r.Name}, ${r.Type}`)
          return false
        }
      }).includes(true)) {
        console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`)
      } else {
        console.log(`All resource record sets for zone ${zoneID} have been deleted.`)
        break
      }
  
      console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`)
      await new Promise(resolve => setTimeout(resolve, 20000))
    }
  }

  await waitForRecordSetDeletion(zoneID, useIAM)
  
  try {
    console.log(`Creating resource record sets for ${myDomain}`)
    returnVal = execSync(`aws route53 change-resource-record-sets --hosted-zone-id ${zoneID} --change-batch '${JSON.stringify(recordSet)}' --profile ${useIAM}`)
    console.log(`Updated record set for ${myDomain}.`)
   } catch (e) {
    console.error(`Unable to create resource record set for ${myDomain}`)
    throw e
  }

  return returnVal
}

const deployFrontEnd = async (projName, awsName, useIAM, myDomain, myCertificate, builtFrontEnd) => {
  let temp

  console.log(`Checking to see if bucket ${awsName} already exists.`)
  let bucketExists = false
  try {
    temp = await exec(`aws s3api list-buckets --profile ${useIAM}`)
  } catch (e) {
    console.error(`Problem listing aws s3 buckets for your account`)
    throw e
  }
  JSON.parse(temp.stdout).Buckets.forEach((b) => {
    if (b.Name == awsName) {
      bucketExists = true;
      console.log(`Bucket exists. Skipping create.`)
    }
  })

  let OAC = getOAC(useIAM); //this will create if necessary. Returns OAC as promise.
  let ACLarn = makeACL(useIAM); //this will create if necessary. Returns ACLID as promise.

  if (!bucketExists) {
    console.log("Bucket does not yet exist. Creating s3 bucket")
    try {
      await exec(`aws s3 mb s3://`.concat(awsName).concat(` --profile `).concat(useIAM))
    } catch(e) {
      console.error('Problem creating bucket for front-end')
      throw e
    }    
  }

  builtFrontEnd = await builtFrontEnd; //need this before we sync! 
  let syncMe
  try {
    syncMe = syncS3(awsName, useIAM)
  } catch(e) {
    console.error(`Unable to sync local build with s3 bucket`)
    throw e
  }


  let myCloud, theCloud
  console.log(`Checking for CloudFront distribution`)
  let distributionExists = false;
  try {
    temp = await exec(`aws cloudfront list-distributions --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`)
    throw e
  }
  if (temp.stdout != "") {
    JSON.parse(temp.stdout).DistributionList.Items.forEach((d) => {
      let tempCheck = false;
      try {
        tempCheck = (d.Origins.Items[0].Id == awsName)
      } catch (e) {
        // Probably not a fully created cloudfront distribution.
        // Probably can ignore this. 
        console.warn('\x1b[31m%s\x1b[0m', `Found an incompletely-specified cloudFront distribution. This may not be a problem, but you should check.`)
        console.warn('\x1b[31m%s\x1b[0m', `Worst-case scenario, run 'pushkin aws armageddon' and start over.`)
      }
      if (tempCheck) {
        distributionExists = true;
        theCloud = d
        console.log(`Distribution for ${awsName} found. Updating files. Note that if you do this more than 1000x/month, you'll start incurring extra charges.`)
        //because the next step is only sometimes run, and because it is very fast, it was simpler to do an 'await' then do asynchronously
        try {
          exec(`aws cloudfront create-invalidation --distribution-id ${d.Id} --paths "/*" --profile ${useIAM}`) //this will finish when it finishes. No hurry.
        } catch(e) {
          console.error(`Unable to update cloudfront cache`)
          throw e
        }
      }
    })  
  }

  if (!distributionExists) {
    console.log(`No existing cloudFront distribution for ${awsName}. Creating distribution.`)
    let myCloudFront = JSON.parse(JSON.stringify(cloudFront));
    myCloudFront.DistributionConfig.Origins.Items[0].OriginAccessControlId = await OAC; //we'll need this before continuing.
    myCloudFront.DistributionConfig.WebACLId = await ACLarn; //we'll need this before continuing.
    myCloudFront.DistributionConfig.CallerReference = awsName;
    myCloudFront.DistributionConfig.DefaultCacheBehavior.TargetOriginId = awsName;
    myCloudFront.DistributionConfig.Origins.Items[0].Id = awsName;
    myCloudFront.DistributionConfig.Origins.Items[0].DomainName = awsName.concat('.s3.amazonaws.com');
    myCloudFront.Tags.Items[0].Value = projName
    if (myDomain != "default") {
      // set up DNS
      myCloudFront.DistributionConfig.Aliases.Quantity = 2
      myCloudFront.DistributionConfig.Aliases.Items = [myDomain, 'www.'.concat(myDomain)]
      myCloudFront.DistributionConfig.ViewerCertificate.CloudFrontDefaultCertificate = false
      myCloudFront.DistributionConfig.ViewerCertificate.ACMCertificateArn = myCertificate
      myCloudFront.DistributionConfig.ViewerCertificate.SSLSupportMethod = 'sni-only'
      myCloudFront.DistributionConfig.ViewerCertificate.MinimumProtocolVersion = 'TLSv1.2_2019'
    }
    try {
      myCloud = await exec(`aws cloudfront create-distribution-with-tags --distribution-config-with-tags '`.concat(JSON.stringify(myCloudFront)).concat(`' --profile ${useIAM}`))
      theCloud = JSON.parse(myCloud.stdout).Distribution 
    } catch (e) {
      console.log('Could not set up cloudfront.')
      throw e
    }


    console.log("Setting bucket permissions")
      policy.Statement[0].Resource = "arn:aws:s3:::".concat(awsName).concat("/*")
      policy.Statement[0].Condition.StringEquals["AWS:SourceArn"] = theCloud.ARN
      try {
        await exec(`aws s3api put-bucket-policy --bucket `.concat(awsName).concat(` --policy '`).concat(JSON.stringify(policy)).concat(`' --profile ${useIAM}`))
      } catch (e) {
        console.error('Problem setting bucket permissions for front-end')
        throw e
      }
    
    console.log(`Updating awsResources with cloudfront info`)
    try {
      let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
      awsResources.cloudFrontId = theCloud.Id
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
    } catch (e) {
      console.error(`Unable to update awsResources.js`)
      console.error(e)
    }    
  }

  if (myDomain != "default") {
    try {
      makeRecordSet(myDomain, useIAM, projName, theCloud) 
    } catch (e) {
      throw e
    }
  }

  await syncMe
  console.log(`Finished syncing files`)

  return theCloud.DomainName
}

const getOAC = async (useIAM) => {
  const createOAC = async (useIAM) => {
    let temp
    try {
      temp = await exec(`aws cloudfront create-origin-access-control --origin-access-control-config '`.concat(JSON.stringify(OriginAccessControl)).concat(`' --profile ${useIAM}`))
    } catch (error) {
      console.error(`Unable to create Origin Access Control`)
      throw error
    }
    return JSON.parse(temp.stdout).OriginAccessControl.Id
  }

  console.log(`Checking to see if OAC already exists.`)

  let awsResources
  try {
    awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
  } catch (e) {
    console.error(`Unable to read awsResources.js. That's strange.`)
    console.error(e)
    throw e
  } 

  let needOAC = false;

  if (awsResources && !awsResources.OAC) {
    console.log(`No origin access control. Creating.`)
    needOAC = true;
  } else {
    let temp
    try {
      temp = await exec(`aws cloudfront get-origin-access-control --id ${awsResources.OAC} --profile ${useIAM}`)
    } catch (e) {
      console.log(e)
      console.log(`Huh. I can't find that OAC. Making a new one.`)
      needOAC = true;
    }
  }

  if (needOAC) {
    awsResources.OAC = await createOAC(useIAM);
    try {
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');  
    } catch (error) {
      console.error(`Can't write to awsResources.js. That's strange.`)
      throw error
    }
  }

  return Promise.resolve(awsResources.OAC)
}

const initDB = async (dbType, securityGroupID, projName, awsName, useIAM) => {
  console.log(`Handling ${dbType} database.`)
  let stdOut, dbName, dbPassword
  dbName = projName.concat(dbType).replace(/[^A-Za-z0-9]/g, "")

  const doINeedDB = async (dbName, dbType, useIAM) => {
    //First, check pushkin.yaml -- do we have a database already?
    let temp
    let pushkinConfig
    try {
      temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
      pushkinConfig = jsYaml.load(temp)
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`)
      throw e;
    }
    if (pushkinConfig.productionDBs && Object.keys(pushkinConfig.productionDBs).includes(dbType) && pushkinConfig.productionDBs[dbType].name == dbName) {
      console.warn('\x1b[31m%s\x1b[0m', `${dbName} is in pushkin.yaml. If that surprises you, look into it.\n Checking whether it is also on RDS.`)
      //check whether it's fully configured in RDS
      //First, check to see if database exists
      try {
        stdOut = await exec(`aws rds describe-db-instances --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to get list of RDS databases`)
        throw e
      }
      let foundDB = false;
      let retrievedDBInfo
      JSON.parse(stdOut.stdout).DBInstances.forEach((db) => {
        if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
          foundDB = true;
          retrievedDBInfo = db
        }
      })
      if (foundDB) {
        //Does its parameters match what we expect?
        let sameParams = true;
        if (pushkinConfig.productionDBs[dbType].name.toLowerCase() != retrievedDBInfo.DBName.toLowerCase()) {sameParams = false; console.warn('\x1b[31m%s\x1b[0m', `Database name on RDS does not match pushkin.yaml`)}
        if (pushkinConfig.productionDBs[dbType].user != retrievedDBInfo.MasterUsername) {sameParams = false; console.warn}
        //if (pushkinConfig.productionDBs[dbType].pass != FUBAR) {sameParams = false} //No way to check the password; assume if rest is correct, that's still correct
        if (pushkinConfig.productionDBs[dbType].port != retrievedDBInfo.Endpoint.Port) {sameParams = false; console.warn('\x1b[31m%s\x1b[0m', `Database port on RDS does not match pushkin.yaml`)}
        if (pushkinConfig.productionDBs[dbType].host != retrievedDBInfo.Endpoint.Address) {sameParams = false; console.warn('\x1b[31m%s\x1b[0m', `Database host on RDS does not match pushkin.yaml`)}
        if (sameParams) {
          console.log(`${dbName} is already configured on RDS. Skipping.\n Note that if the password stored in the YAML is wrong, the CLI can't check that.`)
          return false; //let's us skip creation later on
        } else {
          console.error(`${dbName} is already configured on RDS, but with different parameters.`)
          console.error(`Pushkin.yaml has:`, pushkinConfig.productionDBs[dbType])
          console.error(`RDS has:`, retrievedDBInfo)
          process.exit()
        }
      } else {
        console.warn('\x1b[31m%s\x1b[0m', `Database listed in pushkin.yaml, but not found on RDS. Creating.`)
        return true
      }
    } else {
      try {
        stdOut = await exec(`aws rds describe-db-instances --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to get list of RDS databases`)
        throw e
      }
      let foundDB = false;
      let retrievedDBInfo
      JSON.parse(stdOut.stdout).DBInstances.forEach((db) => {
        if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
          foundDB = true;
          retrievedDBInfo = db
        }
      })
      if (foundDB) {
        //We can't easily work around this, because we don't have the password saved anywhere!
        console.warn('\x1b[31m%s\x1b[0m', `Database ${dbName} found on RDS, but not listed in pushkin.yaml. This is a problem.\n
          You will need to delete the database from RDS before continuing.`)
        process.exit()
      } else {
        return true
      }
    }
  }

  let needDB = await doINeedDB(dbName, dbType, useIAM)
  if (needDB) {
    // Function to generate a secure random password
    const generateSecurePassword = () => {
      const length = 12; 
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
      let password = '';
      
      for (let i = 0; i < length; i++) {
          const randomIndex = crypto.randomInt(0, charset.length);
          password += charset[randomIndex];
      }
      
      return password;
    };

    dbPassword = generateSecurePassword() //Pick random password for database
    let myDBConfig = JSON.parse(JSON.stringify(dbConfig));
    myDBConfig.DBName = dbName
    myDBConfig.DBInstanceIdentifier = dbName
    myDBConfig.VpcSecurityGroupIds = [securityGroupID]
    myDBConfig.MasterUserPassword = dbPassword
    myDBConfig.Tags[0].Value = projName
    try {
      stdOut = await exec(`aws rds create-db-instance --cli-input-json '`.concat(JSON.stringify(myDBConfig)).concat(`' --profile `).concat(useIAM))
    } catch(e) {
      console.error(`Unable to create database ${dbType}`)
      throw e
    }

    console.log(`Database ${dbType} created with following:`, myDBConfig)
    console.log(`Database ${dbType} created.`)

    try {
      // should hang until instance is available
      console.log(`Waiting for ${dbType} to spool up. This may take a while...`)
      stdOut = await exec(`aws rds wait db-instance-available --db-instance-identifier ${dbName} --profile ${useIAM}`)
      console.log(`${dbType} is spooled up!`)
    } catch (e) {
      console.error(`Problem waiting for ${dbType} to spool up.`)
      throw e
    }

    let dbEndpoint
    try {
        stdOut = await exec(`aws rds describe-db-instances --db-instance-identifier ${dbName} --profile ${useIAM}`)
        dbEndpoint = JSON.parse(stdOut.stdout);
    } catch (e) {
      console.error(`Problem getting ${dbType} endpoint.`)
      throw e
    }
  
    //Updating list of AWS resources
    console.log('Updated awsResources with db information')
    try {
      let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
      if (awsResources && awsResources.dbs) {
        awsResources.dbs.push(dbName)
      } else {
        awsResources.dbs = [dbName]
      }
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
    } catch (e) {
      console.error(`Unable to update awsResources.js`)
      console.error(e)
    }    
    
    const newDB = {
      "type": dbType,
      "name": dbName, 
      "host": dbEndpoint.DBInstances[0].Endpoint.Address, 
      "url": dbEndpoint.DBInstances[0].Endpoint.Address, //this is same as 'host' for AWS, but different for local deploy in Docker
      "user": myDBConfig.MasterUsername, 
      "pass": myDBConfig.MasterUserPassword,
      "port": myDBConfig.Port
    }
    
    return newDB
  } else {
    //Already set up. Just return the info.
    let temp
    let pushkinConfig
    try {
      temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
      pushkinConfig = jsYaml.load(temp)
    } catch (e) {
      console.error(`Couldn't load pushkin.yaml`)
      throw e;
    }
    return pushkinConfig.productionDBs[dbType]
  }
}
 
const getDBInfo = async () => {
  let temp
  let pushkinConfig
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.load(temp)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e;
  }
  if (Object.keys(pushkinConfig.productionDBs).length >= 2 ) {
    let dbsByType = {}
    Object.keys(pushkinConfig.productionDBs).forEach((d) => {
      dbsByType[pushkinConfig.productionDBs[d].type] = {
        "name": pushkinConfig.productionDBs[d].name,
        "username": pushkinConfig.productionDBs[d].user,
        "password": pushkinConfig.productionDBs[d].pass,
        "port": pushkinConfig.productionDBs[d].port,
        "endpoint": pushkinConfig.productionDBs[d].host
      }
    })
    return dbsByType  
  } else {
    throw new Error(`Error finding production DBs in pushkin.yaml`);
  }

  return dbsByType
}


const ecsTaskCreator = async (projName, awsName, useIAM, DHID, completedDBs, ECSName, targGroupARN) => {
  let mkTaskDir
  let temp
  try {
    if (fs.existsSync(path.join(process.cwd(), 'ECStasks'))) {
      //nothing
    } else {
      console.log('Making ECSTasks folder')
      await mkdir(path.join(process.cwd(), 'ECStasks'))
    }
  } catch (e) {
    console.error(`Problem with ECSTasks folder`)
    throw e
  }

  const ecsCompose = async (yaml, task, name, port = 0, targGroupARN = false) => {

    const wait = async () => {
      //Sometimes, I really miss loops
      let x = await exec(`aws ecs describe-clusters --profile ${useIAM} --clusters ${ECSName}`)
            .then((x) => {
              let y = JSON.parse(x.stdout).clusters[0]
              return y.registeredContainerInstancesCount
            },
            err => {console.error(err)})
      if (x > 0) {
        try {
          console.log(`Writing ECS task list ${name}`)
          await fs.promises.writeFile(path.join(process.cwd(), 'ECStasks', yaml), jsYaml.dump(task), 'utf8');
        } catch (e) {
          console.error(`Unable to write ${yaml}`)
          console.error(`Had hoped to write :\n`, task)
          throw e
        }
        let compose
        try {
          console.log(`Running ECS compose for ${name}`)
          let balancerCommand = (targGroupARN ? `--target-groups "targetGroupArn=${targGroupARN},containerName=${name},containerPort=${port}"` : '')
          let composeCommand = `ecs-cli compose -f ${yaml} -p ${yaml.split('.')[0]} service up --ecs-profile ${useIAM} --cluster-config ${ECSName} --scheduling-strategy DAEMON `.concat(balancerCommand)
          compose = exec(composeCommand, { cwd: path.join(process.cwd(), "ECStasks")})
        } catch (e) {
          console.error(`Failed to run ecs-cli compose service on ${yaml}`)
          throw e
        }
        return compose
      } else {
        console.log('Waiting for ECS to spool up...')
        setTimeout( wait, 10000 );
      }
    }

    console.log(`Updated awsResources with ECS information`)
    try {
      let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
      awsResources.ECSName = ECSName
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
    } catch (e) {
      console.error(`Unable to update awsResources.js`)
      console.error(e)
    }    

    console.log('Waiting for ECS cluster to start...')
    return await wait();
  }

  const rabbitPW = Math.random().toString();
  const rabbitUser = projName.replace(/[^A-Za-z0-9]/g, "")
  const rabbitCookie = uuid();
  const rabbitAddress = "amqp://".concat(rabbitUser).concat(":").concat(rabbitPW).concat("@localhost:5672")
  let myRabbitTask = JSON.parse(JSON.stringify(rabbitTask));
  myRabbitTask.services['message-queue'].environment.RABBITMQ_DEFAULT_USER = rabbitUser;
  myRabbitTask.services['message-queue'].environment.RABBITMQ_DEFAULT_PASS = rabbitPW;
  myRabbitTask.services['message-queue'].environment.RABBITMQ_ERLANG_COOKIE = rabbitCookie;
  myRabbitTask.services['message-queue'].logging.options['awslogs-group'] = `ecs/${projName}`
  myRabbitTask.services['message-queue'].logging.options['awslogs-stream-prefix'] = `ecs/rabbit/${projName}`
  apiTask.services['api'].environment.AMQP_ADDRESS = rabbitAddress;
  apiTask.services['api'].image = `${DHID}/api:latest`
  apiTask.services['api'].logging.options['awslogs-group'] = `ecs/${projName}`
  apiTask.services['api'].logging.options['awslogs-stream-prefix'] = `ecs/api/${projName}`

  let docker_compose
  try {
    docker_compose = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'), 'utf8'));
  } catch(e) {
    console.error('Failed to load the docker-compose. That is extremely odd.')
    throw e
  }

  let workerList = []
  try {
    Object.keys(docker_compose.services).forEach((s) => {
      if ( docker_compose.services[s].labels != null && docker_compose.services[s].labels.isPushkinWorker ) {
        workerList.push(s)
      } 
    })
  } catch (e) {
    throw e
  }

  console.log(`ECS task creation waiting on DBs`)
  temp = await completedDBs; //Next part won't run if DBs aren't done
  const dbInfoByTask = await getDBInfo();

  let composedRabbit
  let composedAPI
  let composedWorkers
  try {
    composedRabbit = ecsCompose('rabbitTask.yml', myRabbitTask, 'message-queue')
    composedRabbit = ecsCompose('apiTask.yml', apiTask, 'api', 80, targGroupARN)
    composedWorkers = workerList.map((w) => {
      const yaml = w.concat('.yml')
      const name = w;
      let task = {}
      let expName = w.split("_worker")[0]
      task.version = workerTask.version;
      task.services = {};
      task.services[w] = workerTask.services["EXPERIMENT_NAME"]
      task.services[w].image = `${DHID}/${w}:latest`
      task.services[w].logging.options['awslogs-group'] = `ecs/${projName}`
      task.services[w].logging.options['awslogs-stream-prefix'] = `ecs/${w}/${projName}`
          //Note that "DB_USER", "DB_NAME", "DB_PASS", "DB_URL" are redundant with "DB_SMARTURL"
      //For simplicity, newer versions of pushkin-worker will expect DB_SMARTURL
      //However, existing deploys won't have that. So both sets of information are maintained
      //for backwards compatibility, at least for the time being. 
      task.services[w].environment = {
        "AMQP_ADDRESS" : rabbitAddress,
        "DB_HOST": dbInfoByTask['Main'].endpoint,
        "DB_USER": dbInfoByTask['Main'].username,
        "DB_DB": dbInfoByTask['Main'].name,
        "DB_PASS": dbInfoByTask['Main'].password,
        "DB_URL": dbInfoByTask['Main'].endpoint,
        //"TRANS_URL": `postgres://${dbInfoByTask['Transaction'].username}:${dbInfoByTask['Transaction'].password}@${dbInfoByTask['Transaction'].endpoint}:/${dbInfoByTask['Transaction'].port}/${dbInfoByTask['Transaction'].name}`
        "TRANS_HOST": dbInfoByTask['Transaction'].endpoint,
        "TRANS_USER": dbInfoByTask['Transaction'].username,
        "TRANS_DB": dbInfoByTask['Transaction'].name,
        "TRANS_PASS": dbInfoByTask['Transaction'].password,
        "TRANS_URL": dbInfoByTask['Transaction'].endpoint,
      }
      return ecsCompose(yaml, task, name)
    })
  } catch (e) {
    throw e
  }

  return Promise.all([composedRabbit, composedAPI, composedWorkers]);
}

const setupECS = async (projName, awsName, useIAM, DHID, completedDBs, myCertificate) => {
  console.log(`Starting ECS setup`)
  let temp

  const makeSSH = async (useIAM) => {
    let keyPairs
    let foundPushkinKeyPair = false
    try {
      keyPairs = await exec(`aws ec2 describe-key-pairs --profile ${useIAM}`)
    } catch (e) {
      console.error(`Failed to get list of key pairs`)
    }
    JSON.parse(keyPairs.stdout).KeyPairs.forEach((k) => {
    if (k.KeyName == 'my-pushkin-key-pair') {foundPushkinKeyPair = true}
    })

    if (foundPushkinKeyPair) {
      console.log(`Pushkin key pair already exists. Skipping creation.`)
      return
    } else {
      let keyPair
      try {
        console.error(`Making SSH key`)
        keyPair = await exec(`aws ec2 create-key-pair --key-name my-pushkin-key-pair --query 'KeyMaterial' --profile ${useIAM} --output text > .pushkinKey`)
        await exec(`chmod 400 .pushkinKey`)
      } catch (e) {
        console.error(`Problem creating AWS SSH key`)
      }
      return
    }
  }


  let madeSSH = makeSSH(useIAM)
  //make security group for load balancer. Start this process early, though it doesn't take super long.
  const makeBalancerGroup = async(useIAM, projName) => {
    console.log(`Creating security group for load balancer`)
    let SGCreate = `aws ec2 create-security-group --group-name BalancerGroup --description "For the load balancer" --tag-specifications 'ResourceType=security-group,Tags=[{Key=PUSHKIN,Value=${projName}}]' --profile ${useIAM}`
    let SGRule1 = `aws ec2 authorize-security-group-ingress --group-name BalancerGroup --ip-permissions IpProtocol=tcp,FromPort=80,ToPort=80,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let SGRule2 = `aws ec2 authorize-security-group-ingress --group-name BalancerGroup --ip-permissions IpProtocol=tcp,FromPort=443,ToPort=443,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let stdOut
    try {
      stdOut = await exec(SGCreate)
      await Promise.all([exec(SGRule1), exec(SGRule2)])
    } catch(e) {
      console.error(`Failed to create security group for load balancer`)
      throw e
    }
    return JSON.parse(stdOut.stdout).GroupId //remember security group in order to use later!
  }

  let securityGroups
  try {
    securityGroups = await exec(`aws ec2 describe-security-groups --profile ${useIAM}`)
  } catch (e) {
    console.error(`Failed to retried list of security groups from aws`)
    throw e
  }
  let foundBalancerGroup = false
  let madeBalancerGroup
  let BalancerSecurityGroupID
  JSON.parse(securityGroups.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == 'BalancerGroup') {foundBalancerGroup = g.GroupId}
    })
  if (foundBalancerGroup)  {
    console.log(`Security group 'BalancerGroup' already exists. Skipping create.`)
    BalancerSecurityGroupID = foundBalancerGroup
  } else {
    try {
      madeBalancerGroup = makeBalancerGroup(useIAM, projName) //start this process early. Will use much later. 
    } catch(e) {
      throw e
    }
  }

  //make security group for ECS cluster. Start this process early, though it doesn't take super long.
  const makeECSGroup = async(useIAM, projName) => {
    console.log(`Creating security group for ECS cluster`)
    let SGCreate = `aws ec2 create-security-group --group-name ECSGroup --description "For the ECS cluster" --tag-specifications 'ResourceType=security-group,Tags=[{Key=PUSHKIN,Value=${projName}}]' --profile ${useIAM}`
    let stdOut
    let groupId
    try {
      stdOut = await exec(SGCreate)
      groupId = JSON.parse(stdOut.stdout).GroupId //remember security group in order to use later!
      let SGRule1 = `aws ec2 authorize-security-group-ingress --group-id ${groupId} --ip-permissions IpProtocol=tcp,FromPort=80,ToPort=80,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
      let SGRule2 = `aws ec2 authorize-security-group-ingress --group-id ${groupId} --ip-permissions IpProtocol=tcp,FromPort=22,ToPort=22,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
      let SGRule3 = `aws ec2 authorize-security-group-ingress --group-id ${groupId} --ip-permissions IpProtocol=tcp,FromPort=1024,ToPort=65535,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
      //let SGRule4 = `aws ec2 authorize-security-group-egress --group-id ${groupId} --ip-permissions IpProtocol=-1,IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
      //await Promise.all([exec(SGRule1), exec(SGRule2), exec(SGRule3), exec(SGRule4)])
      await Promise.all([exec(SGRule1), exec(SGRule2), exec(SGRule3)])
    } catch(e) {
      console.error(`Failed to create security group for load balancer`)
      throw e
    }
    return groupId
  }

  let ecsSecurityGroupID;
  let foundECSGroup = false
  let madeECSGroup
  JSON.parse(securityGroups.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == 'ECSGroup') {foundECSGroup = g.GroupId}
    })
  if (foundECSGroup)  {
    console.log(`Security group 'foundECSGroup' already exists. Skipping create.`)
    ecsSecurityGroupID = foundECSGroup
  } else {
    try {
      madeECSGroup = makeECSGroup(useIAM, projName) //start this process early. Will use much later. 
    } catch(e) {
      throw e
    }
  }


  //need one subnet per availability zone in region. Region is based on region for the profile.
  //Start this process early to use later. 
  const foundSubnets = new Promise((resolve, reject) => {
    console.log(`Retrieving subnets for AWS zone`)
    exec(`aws ec2 describe-subnets --profile ${useIAM}`)
    .catch((e) => {
      console.error(`Failed to retrieve available subnets.`)
      reject(e)
    })
    .then((sns) => {
      let subnets = {}
      JSON.parse(sns.stdout).Subnets.forEach((subnet) => {
        subnets[subnet.AvailabilityZone] = subnet.SubnetId
      })
      resolve(subnets)      
    })
  })

  //CLI uses the default VPC by default. Retrieve the ID.
  const getVPC = async (useIAM) => {
    console.log('getting default VPC')
    let temp
    try {
      temp = await exec(`aws ec2 describe-vpcs --profile ${useIAM}`)
    } catch (e) {
      console.error(`Unable to find VPC`)
      throw e
    }
    let useVPC
    JSON.parse(temp.stdout).Vpcs.forEach((v) => {
      if (v.IsDefault == true) {
        useVPC = v.VpcId
      }
    })
    console.log('Default VPC: ', useVPC)
    return useVPC
  }
  let gotVPC
  try {
    gotVPC = getVPC(useIAM)
  } catch(e) {
    throw e
  }

  let mkTaskDir
  try {
    if (fs.existsSync(path.join(process.cwd(), 'ECStasks'))) {
      //nothing
    } else {
      console.log('Making ECSTasks folder')
      await mkdir(path.join(process.cwd(), 'ECStasks'))
    }
  } catch (e) {
    console.error(`Problem with ECSTasks folder`)
    throw e
  }
  try {
    console.log(`Making ecs-params.yml`)
    // This lets us set the network mode for all services.
    // Currently that cannot be done through the task docker file
    let ecsParams = {
      "version": 1,
      "task_definition": {
        "ecs_network_mode": "host"
      }
     }
    await fs.promises.writeFile(path.join(process.cwd(), 'ECStasks/ecs-params.yml'), jsYaml.dump(ecsParams), 'utf8')
  } catch (e) {
    console.error(`Unable to create ecs-params.yml`)
    throw e
  }


  //Everything past here requires the ECS CLI having been set up  
  console.log("Configuring ECS CLI")
  let aws_access_key_id
  let aws_secret_access_key
  try {
    aws_access_key_id = execSync(`aws configure get aws_access_key_id --profile ${useIAM}`).toString()
    aws_secret_access_key = execSync(`aws configure get aws_secret_access_key --profile ${useIAM}`).toString()
  } catch (e) {
    console.error(`Unable to load AWS credentials for ${useIAM}. Are you sure you have this profile configured for the AWS CLI?`)
    throw e
  }

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");
  const setProfile = `ecs-cli configure profile --profile-name ${useIAM} --access-key ${aws_access_key_id} --secret-key ${aws_secret_access_key}`.replace(/(\r\n|\n|\r)/gm," ")
  let profileSet
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    profileSet = await exec(setProfile)
  } catch (e) {
    console.error(`Unable to set up profile ${useIAM} for ECS CLI.`)
    throw e
  }

  const nameCluster = `ecs-cli configure --region us-east-1 --cluster ${ECSName} --default-launch-type EC2 --config-name ${ECSName}`
  const setDefaultCluster = `ecs-cli configure default --config-name ${ECSName}`
  let clusterResults
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    clusterResults = await exec(nameCluster)
    clusterResults = await exec(setDefaultCluster)
  } catch (e) {
    console.error(`Unable to set default cluster ${ECSName} for ECS CLI.`)
    throw e
  }
  console.log(`ECS CLI configured`)

  let launchedECS
  madeSSH = await madeSSH //need this shortly
  console.log(`SSH set up`)
  const zones = await foundSubnets
  console.log(`Subnets identified`)
  let subnets
  try {
    subnets = Object.keys(zones).map((z) => zones[z])
  } catch (e) {
    console.error(`Problem extracting list of subnets in your zone from 'zones': `, zones)
    throw e
  }

  if (!ecsSecurityGroupID) {
    //If we didn't find one, we must be making it
    console.log("Waiting for ecsSecurityGroupID")
    ecsSecurityGroupID = await madeECSGroup
  }
  const myVPC = await gotVPC
  try {
    console.log('Launching ECS cluster')
    //Note that cluster is named here, although that should match the default anyway.
    const ecsCommand = `ecs-cli up --force --keypair my-pushkin-key-pair --capability-iam --ecs-profile ${useIAM} --size 1 --instance-type t2.small --cluster ${ECSName} --security-group ${ecsSecurityGroupID} --vpc ${myVPC} --subnets ${subnets.join(' ')}`
    launchedECS = exec(ecsCommand)
  } catch (e) {
    console.error(`Unable to launch cluster ${ECSName}.`)
    throw e
  }

  console.log(`Creating application load balancer`)
  if (!foundBalancerGroup) {BalancerSecurityGroupID = await madeBalancerGroup}
  const loadBalancerName = ECSName.concat("Balancer")

  try {
    console.log(`Updating awsResources.js with load balancer info`)
    let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsResources.loadBalancerName = loadBalancerName
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

  let madeBalancer
  try {
    madeBalancer = exec(`aws elbv2 create-load-balancer --name ${loadBalancerName} --type application --scheme internet-facing --subnets ${subnets.join(' ')} --security-groups ${BalancerSecurityGroupID} --tags '[{"Key":"PUSHKIN","Value":"${projName}"}]' --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to create application load balancer`)
    throw e
  }

  let tempMakeTargetGroup
  try {
    tempMakeTargetGroup = await exec(`aws elbv2 create-target-group --name ${loadBalancerName.concat("Targets").slice(0,32)} --protocol HTTP --port 80 --vpc-id ${myVPC} --profile ${useIAM}`)
  } catch(e) {
    console.error(`Unable to create target group`)
    throw e
  }
  const targGroupARN = JSON.parse(tempMakeTargetGroup.stdout).TargetGroups[0].TargetGroupArn
  try {
    console.log(`Updating awsResources.js with target group info`)
    let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsResources.targGroupARN = targGroupARN
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

  let aMadeBalancer = await madeBalancer //need this for the next step
  const balancerARN = JSON.parse(aMadeBalancer.stdout).LoadBalancers[0].LoadBalancerArn
  const balancerEndpoint = JSON.parse(aMadeBalancer.stdout).LoadBalancers[0].DNSName
  const balancerZone = JSON.parse(aMadeBalancer.stdout).LoadBalancers[0].CanonicalHostedZoneId
  let madeListener
  try {
    madeListener = await exec(`aws elbv2 create-listener --load-balancer-arn ${balancerARN} --protocol HTTP --port 80  --default-actions Type=forward,TargetGroupArn=${targGroupARN} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to create listener`)
    throw e
  }

  let addedHTTPS
  try {
    addedHTTPS = exec(`aws elbv2 create-listener --load-balancer-arn ${balancerARN} --protocol HTTPS --port 443 --certificates CertificateArn=${myCertificate} --default-actions Type=forward,TargetGroupArn=${targGroupARN} --profile ${useIAM}`)
    console.log(`Added HTTPS to load balancer`)
  } catch (e) {
    console.error(`Unable to add HTTPS to load balancer`)
    throw e
  }

  await Promise.all([ launchedECS, addedHTTPS])
  console.log(`ECS cluster launched`)

  let createdECSTasks
  try {
    console.log('Creating ECS tasks')
    createdECSTasks = ecsTaskCreator(projName, awsName, useIAM, DHID, completedDBs, ECSName, targGroupARN);
  } catch(e) {
    throw e
  }
  createdECSTasks = await createdECSTasks
  console.log(`Created ECS task definitions`)

  return [ balancerEndpoint, balancerZone]
}

const forwardAPIWrapper = async (configuredECS, useIAM, projName, myDomain, deployedFrontEnd) => {
  const forwardAPI = async (myDomain, useIAM, balancerEndpoint, balancerZone, projName) => {

    // This whole function can be skipped if not using custom domain
    // The API endpoint will have to be set manually
    if (myDomain != "default") {
      let temp
      console.log(`Retrieving hostedzone ID for ${myDomain}`)
      let zoneID
      try {
        temp = await exec(`aws route53 list-hosted-zones-by-name --dns-name ${myDomain} --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to retrieve hostedzone for ${myDomain}`)
        throw e
      }
      if (JSON.parse(temp.stdout).HostedZones.length == 0) {
        console.error(`No hostedzone found for ${myDomain}`)
        throw new Error(`No hostedzone found for ${myDomain}`)
      }
      try {
        zoneID = JSON.parse(temp.stdout).HostedZones[0].Id.split("/hostedzone/")[1]
      } catch (e) {
        console.error(`Unable to parse hostedzone for ${myDomain}`)
        throw e
      }
  
      // The following will update the resource records, creating them if they don't already exist
  
      console.log(`Updating record set for ${myDomain} in order to forward API`)
      let recordSet = {
        "Comment": "",
        "Changes": []
      }
      recordSet.Changes[0] = JSON.parse(JSON.stringify(changeSet));
  
      recordSet.Changes[0].ResourceRecordSet.Name = 'api.'.concat(myDomain)
      recordSet.Changes[0].ResourceRecordSet.AliasTarget.DNSName = balancerEndpoint
      recordSet.Changes[0].ResourceRecordSet.Type = "A"
      recordSet.Changes[0].ResourceRecordSet.AliasTarget.HostedZoneId = balancerZone
      recordSet.Changes[0].ResourceRecordSet.SetIdentifier = projName
      try {
        await exec(`aws route53 change-resource-record-sets --hosted-zone-id ${zoneID} --change-batch '${JSON.stringify(recordSet)}' --profile ${useIAM}`)
        console.log(`Updated record set for ${myDomain}.`)
       } catch (e) {
        console.error(`Unable to create resource record set for ${myDomain}`)
        throw e
      }
    }
  
    return true
  }

  let balancerEndpoint
  let balancerZone
  [ balancerEndpoint, balancerZone] = await configuredECS
  await deployedFrontEnd //We create a record set for the API during front-end setup, don't want to delete it now!
  let apiForwarded
  try {
    apiForwarded = forwardAPI(myDomain, useIAM, balancerEndpoint, balancerZone, projName)
  } catch(e) {
    console.error(`Unable to set up forwarding for API`)
    throw e
  }

  return apiForwarded
}

const handleSecurityGroups = async (useIAM, projName) => {
  const createDatabaseGroup = async (useIAM, projName) => {
    let SGCreate = `aws ec2 create-security-group --group-name DatabaseGroup --description "For connecting to databases" --tag-specifications 'ResourceType=security-group,Tags=[{Key=PUSHKIN,Value=${projName}}]' --profile ${useIAM}`
    let SGRule = `aws ec2 authorize-security-group-ingress --group-name DatabaseGroup --ip-permissions IpProtocol=tcp,FromPort=5432,ToPort=5432,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let stdOut
    try {
      stdOut = await exec(SGCreate)
      execSync(SGRule)
    } catch(e) {
      console.error(`Failed to create security group for databases`)
      throw e
    }
    return JSON.parse(stdOut.stdout).GroupId //remember security group in order to use later!
  }

  let temp
  try {
    temp = await exec(`aws ec2 describe-security-groups --profile ${useIAM}`)
  } catch (e) {
    console.error(`Failed to retried list of security groups from aws`)
    throw e
  }
  let foundDBGroup
  let madeDBGroup
  JSON.parse(temp.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == 'DatabaseGroup') {foundDBGroup = g.GroupId}
    })

  return new Promise((resolve, reject) => {
    let securityGroupID
    if (foundDBGroup) {
      console.log(`Database security group already exists. Skipping creation.`)
      resolve(foundDBGroup)
    } else {
      console.log('Creating security group for databases')
      resolve(createDatabaseGroup(useIAM, projName))
    }
  })
  console.error(`Shouldn't ever get to this line.`)
}

const recordDBs = async(dbDone) => {
  const returnedPromises = await dbDone //initializedTransactionsDB must be first in this list
  const transactionDB = returnedPromises[0] //this is why it has to be first
  const mainDB = returnedPromises[1] //this is why it has to be second

  console.log(`Databases created. Adding to local config definitions.`)
  let pushkinConfig
  let stdOut;
  try {
    stdOut = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.load(stdOut)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e
  }

  // Would have made sense for local databases and production databases to be nested within 'databases'
  // But poor planning prevents that. And we'd like to avoid breaking changes, so...
  if (pushkinConfig.productionDBs == null) {
    // initialize
    pushkinConfig.productionDBs = {};
  }
  if (transactionDB) {
    // false means it is preexisting, doesn't need to be updated
    pushkinConfig.productionDBs[transactionDB.type] = transactionDB;
  }
  if (mainDB) {
    // false means it is preexisting, doesn't need to be updated
    pushkinConfig.productionDBs[mainDB.type] = mainDB;
  }
  try {
    stdOut = await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.dump(pushkinConfig), 'utf8')
    console.log(`Successfully updated pushkin.yaml with databases.`)
  } catch(e) {
    throw e
  }

 return pushkinConfig;
}

const rebuildWorker = async function(exp){
  let pushkinConfig
  let stdOut;
  try {
    stdOut = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.load(stdOut)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e
  }
  console.log(`Rebuilding AWS-compatible worker for`, exp);
  const expDir = path.join(path.join(process.cwd(), pushkinConfig.experimentsDir), exp)
  if (!fs.lstatSync(expDir).isDirectory()) return('');
  let expConfig;
  try {
    expConfig = readConfig(expDir);
  } catch (err) {
    console.error(`Failed to read experiment config file for `.concat(exp));
    throw err;
  }
  const workerConfig = expConfig.worker;
  const workerName = `${exp}_worker`.toLowerCase(); //Docker names must all be lower case
  const workerLoc = path.join(expDir, workerConfig.location).replace(/ /g, '\\ '); //handle spaces in path

  let workerBuild
  try {
    workerBuild = exec(`docker buildx build --platform linux/amd64 ${workerLoc} -t ${workerName} --load`)
  } catch(e) {
    console.error(`Problem building worker for ${exp}`)
    throw (e)
  }
  return workerBuild;
}

const createLogGroup = async (useIAM, projName) => {
  //Log group for ECS
  let stdOut
  try {
    stdOut = await exec(`aws logs create-log-group --log-group-name ecs/${projName} --profile ${useIAM}`)    
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.warn('\x1b[31m%s\x1b[0m', `Log group ecs/${projName} for ECS already exists. Skipping creation.\n
      If this is a surprise, you should look into it.`)
    } else {
      console.error(`Unable to create log group for ECS`)
      throw e  
    }
  }
  try {
    stdOut = await exec(`aws logs put-retention-policy --log-group-name ecs/${projName} --retention-in-days 7 --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to set retention policy for ECS log group`)
    throw e
  }
}

const migrationsWrapper = async (completedDBs) => {
  console.log(`Handling main table migrations`)
  let dbsToExps, ranMigrations
  let info = await completedDBs
  try {
    dbsToExps = await getMigrations(path.join(process.cwd(), info.experimentsDir), true)
    ranMigrations = runMigrations(dbsToExps, info.productionDBs)
  } catch (e) {
    throw e
  }    
  return ranMigrations
}

const setupTransactionsWrapper = async (completedDBs) => {
  let info = await completedDBs
  let transMigrations = new Map()
  transMigrations.set('Transaction', [{ migrations: path.join(process.cwd(), 'coreMigrations'), seeds: '' }]); 
  let setupTransactionsTable
  try {
    setupTransactionsTable = runMigrations(transMigrations , info.productionDBs)
  } catch (e) {
    throw e    
  }
  return setupTransactionsTable
}

export async function awsInit(projName, awsName, useIAM, DHID) {
  let temp
  let pushkinConfig
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.load(temp)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e
  }

  const chooseCertificate = async(useIAM) => {
    console.log('Setting up SSL for load-balancer')
    let temp
    try {
      temp = await exec(`aws acm list-certificates --profile ${useIAM}`)
    } catch(e) {
      console.error(`Unable to get list of SSL certificates`)
    }
    let certificates = {}
    JSON.parse(temp.stdout).CertificateSummaryList.forEach((c) => {
      certificates[c.DomainName] = c.CertificateArn
    })

    return new Promise((resolve, reject) => {
      console.log(`Choosing...`)
      inquirer.prompt(
          [{ type: 'list', name: 'certificate', choices: Object.keys(certificates), default: 0, 
          message: 'Which SSL certificate would you like to use for your site?' }]
        ).then((answers) => {
          resolve(certificates[answers.certificate])
        })
      })     
  }
  let myCertificate
  try {
    myCertificate = await chooseCertificate(useIAM) //Waiting because otherwise input query gets buried
  } catch (e) {
    throw e
  }

  const chooseDomain = async(useIAM) => {
    console.log('Choosing domain name for site')
    let temp
    try {
      temp = await exec(`aws route53domains list-domains --profile ${useIAM}`)
    } catch(e) {
      console.error(`Unable to get list of SSL certificates`)
    }
    let domains = ['default']
    JSON.parse(temp.stdout).Domains.forEach((c) => {domains.push(c.DomainName)})

    return new Promise((resolve, reject) => {
      console.log(`Choosing...`)
      inquirer.prompt(
          [{ type: 'list', name: 'domain', choices: domains, default: 0, 
          message: 'Which domain would you like to use for your site?' }]
        ).then((answers) => {
          resolve(answers.domain)
        })
      })     
  }
  let myDomain
  try {
    myDomain = await chooseDomain(useIAM) //Waiting because otherwise input query gets buried
  } catch (e) {
    throw e
  }

  pushkinConfig.info.rootDomain = myDomain
  pushkinConfig.info.projName = projName
  pushkinConfig.info.awsName = awsName
  try {
    await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.dump(pushkinConfig), 'utf8')
    console.log(`Successfully updated pushkin.yaml with custom domain.`)
    updatePushkinJs()
  } catch(e) {
    throw e
  }

  //Databases take BY FAR the longest, so start them right after certificate (certificate comes first or things get confused)
  let securityGroupID = await handleSecurityGroups(useIAM, projName)

  let initializedMainDB
  try {
    initializedMainDB = initDB('Main', securityGroupID, projName, awsName, useIAM)
  } catch(e) {
    console.error(`Failed to initialize main database`)
    throw e
  }

  let initializedTransactionDB
  try {
    initializedTransactionDB = initDB('Transaction', securityGroupID, projName, awsName, useIAM)
  } catch(e) {
    console.error(`Failed to initialize transaction database`)
    throw e
  }

  const completedDBs = recordDBs(Promise.all([initializedMainDB, initializedTransactionDB]))

  const expDirs = fs.readdirSync(path.join(process.cwd(), pushkinConfig.experimentsDir));
  let rebuiltWorkers
  try {
    rebuiltWorkers = Promise.all(expDirs.map(rebuildWorker))
  } catch (err) {
    console.error(err);
    throw(err);
  }

  const createdLogGroups = createLogGroup(useIAM, projName)

  //pushing stuff to DockerHub
  let publishedToDocker
  try {
    publishedToDocker = publishToDocker(DHID, rebuiltWorkers);
  } catch(e) {
    console.error('Unable to publish images to DockerHub')
    throw e
  }

  //build front-end
  let builtFrontEnd
  try {
    builtFrontEnd = buildFE(projName)
  } catch(e) {
    throw e
  }

  let deployedFrontEnd
  try {
    deployedFrontEnd = deployFrontEnd(projName, awsName, useIAM, myDomain, myCertificate, builtFrontEnd)
  } catch(e) {
    console.error(`Failed to deploy front end`)
    throw e
  }

  publishedToDocker = await publishedToDocker //need this to configure ECS
  let configuredECS
  try {
    configuredECS = setupECS(projName, awsName, useIAM, DHID, completedDBs, myCertificate);
  } catch(e) {
    throw e
  }

  let setupTransactionsTable
  try {
    setupTransactionsTable = setupTransactionsWrapper(completedDBs)
  } catch (e) {
    console.error(`Unable to run migrations for transactions DB`)
    throw e
  }

  let ranMigrations
  try {
    ranMigrations = migrationsWrapper(completedDBs);
  } catch (e) {
    throw e
  }

  let apiForwarded
  try {
    apiForwarded = forwardAPIWrapper(configuredECS, useIAM, projName, myDomain, deployedFrontEnd);
  } catch (e) {
    throw e
  }

  // This needs to come last, right before 'return'
  if (myDomain == "default") {
    let configuredECSoutput = await configuredECS
    let cloudDomain = await deployedFrontEnd //has actually already resolved, but not sure I can use it directly
    console.log(`Access your website at ${cloudDomain}`)
    console.log(`Be sure to update pushkin/front-end/src/config.js so that the api URL is ${configuredECSoutput[0]}.`)
    pushkinConfig.info.rootDomain = cloudDomain
  }

  pushkinConfig = await completedDBs;

  await Promise.all([deployedFrontEnd, setupTransactionsTable, ranMigrations, apiForwarded])

  await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.dump(pushkinConfig), 'utf8')

  return
}



export async function nameProject(projName) {
  console.log(`Recording project name`)
  let awsResources = {}
  let stdOut, temp, pushkinConfig;
  awsResources.name = projName;
  // make a name for use as a bucket (AWS has rules)
  temp = projName.replace(/[^\w\s]/g, "").replace(/ /g,"-").replace(/_/g,"-").concat(uuid()).toLowerCase();
  if (temp.search(/[a-zA-Z]/g) != 0){
    temp = "p".concat(temp)
  }
  awsResources.awsName = temp
  //use regular expressions to remove underscores from project name
  try {
    stdOut = fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
  } catch(e) {
    console.error(`Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }

  console.log("Resetting db info")
  try {
    pushkinConfig = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'pushkin.yaml'), 'utf8'))
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e;
  }

  if (pushkinConfig.productionDbs){
    Object.keys(pushkinConfig.productionDBs).forEach((db) => {
      pushkinConfig.productionDBs[db].name = null
      pushkinConfig.productionDBs[db].host = null
      pushkinConfig.productionDBs[db].pass = null
      // Leave port and user in place, since those are unlikely to change
    })    
    try {
      fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.dump(pushkinConfig), 'utf8')
    } catch (e) {
      console.error(`Couldn't save pushkin.yaml`)
      throw e;
    }
  }


  return awsResources.awsName
}

const makeACL = async (useIAM) => {
  //This function first checks for an ACL named pushkinACL. If so, return ARN.
  //If not, create one and return the ARN.
  //We don't store anything because the ACL is always called 'pushkinACL' and the ID and ARN can always be looked up if needed.
  const findACL = async (useIAM) => {
    let ACLarn
    let temp
    try {
      temp = await exec(`aws wafv2 list-web-acls --scope CLOUDFRONT --profile ${useIAM}`)
    } catch (e) {
      console.error(`Unable to get list of ACLs`)
      throw e
    }
    if (temp.stdout != "") {
      JSON.parse(temp.stdout).WebACLs.forEach((d) => {
        let tempCheck = false;
        try {
          tempCheck = (d.Name == 'pushkinACL')
        } catch (e) {
          console.warn('\x1b[31m%s\x1b[0m', `Problem reading ACL list.`)
          throw e
        }
        if (tempCheck) {
          ACLarn = d.ARN
        }
      })    
    }
    return ACLarn
  }

  let ACLarn = await findACL(useIAM);
  if (!ACLarn) {
    let temp
    try {
      temp = await exec(`aws wafv2 create-web-acl --name pushkinACL --scope CLOUDFRONT --default-action Allow={}) --profile ${useIAM} --rules `.concat(
        JSON.stringify(pushkinACL.Rules)).concat(' --visibility-config ').concat(JSON.stringify(pushkinACL.VisibilityConfig)))
    } catch (e) {
      console.error(`Unable to create ACL`)
      throw e
    }
    ACLarn = JSON.parse(temp.stdout).Summary.ACLarn
  }
  console.log(`ACL created`)
  return ACLarn
}

export async function addIAM(iam) {
  let temp
  let awsResources
  try {
    awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
  } catch(e) {
    console.error(`Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  awsResources.iam = iam;
  try {
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
  } catch(e) {
    console.error(`Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  return
}

const deleteStack = async (useIAM, killTag) => {
  console.log(`Deleting cloudformation stacks`)
  const getStackList = async (stackType) => {
    let stacksToDelete = []
    let stackList
    try {
      stackList = await exec(`aws cloudformation list-stacks --profile ${useIAM}`)
    } catch (e) {
      console.error(`Unable to list cloudformation stacks`)
      throw e
    }
    if (JSON.parse(stackList.stdout).StackSummaries) {
      JSON.parse(stackList.stdout).StackSummaries.forEach((s) => {
        if (stackType == "deletable") {
          if (s.StackStatus == "Active" | s.StackStatus == "CREATE_COMPLETE") {
            if (killTag && s.Tags.length > 0) {
              if (s.Tags[0].Value == killTag) {
                stacksToDelete.push(s.StackId)
              }
            } else {
              stacksToDelete.push(s.StackId)
            }
          }                
        }
        if (stackType == "alive") {
          if (s.StackStatus != "DELETE_COMPLETE") {
            if (killTag && s.Tags.length > 0) {
              if (s.Tags[0].Value == killTag) {
                stacksToDelete.push(s.StackId)
              }
            } else {
              stacksToDelete.push(s.StackId)
            }
          }                
        }
      })
    }
    return stacksToDelete
  }

  let stacksToDelete
  try {
    stacksToDelete = await getStackList("deletable");
  } catch (e) {
    throw e
  }

  return new Promise(async (resolve, reject) => {
    if (stacksToDelete.length > 0) {
      stacksToDelete.map(async (s) => {
        console.log(`Deleting stack ${s}`)
        try {
          return await exec(`aws cloudformation delete-stack --stack-name ${s} --profile ${useIAM}`)
        } catch (e) {
          console.warn('\x1b[31m%s\x1b[0m', `Unable to find cloudformation stack ${s}. May have already been deleted. Skipping.`)
          return true
        }
      })

      const awaitStacks = async () => {
        let remainingStacks = [];
        try {
          remainingStacks = await getStackList("alive");
        } catch (e) {
          throw e
        }
        if (remainingStacks.length > 0) {
          setTimeout(awaitStacks, 5000)
        } else {
          resolve(true)
        }
      }
      try {
        awaitStacks();
      } catch (e) {
        throw e
      }
    } else {
      resolve(true)
    }
  })
}

const deleteCluster = async(deletedStack, useIAM, killTag, projName, awsResources) => {
  deletedStack = await deletedStack; //probably need this gone first.
  console.log(`Deleted stack: ${deletedStack}`)
  let runningClusters = []
  let clustersToKill = []
  let temp
  try {
    temp = await exec(`aws ecs list-clusters --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to list ECS clusters.\n` + e)
    throw e
  }
  if (JSON.parse(temp.stdout).clusterArns.length > 0) {
    JSON.parse(temp.stdout).clusterArns.map((c) => {
      runningClusters.push(c)
    })
  }
  
  if (!killTag) {
    clustersToKill = runningClusters
  } else {
    console.warn('\x1b[31m%s\x1b[0m', `Only nuking clusters associated with this project. Full list of clusters includes:`)
    console.warn('\x1b[31m%s\x1b[0m', c);
    if (awsResources && !awsResources.ECSName) {
      awsResources.ECSName = projName.replace(/[^A-Za-z0-9]/g, ""); //won't be permanent. Doesn't matter.
    }
    let clusterDescription
    try {
      clusterDescription = await exec(`aws ecs describe-clusters --clusters ${awsResources.ECSName} --profile ${useIAM}`)
    } catch (e) {
      console.warn('\x1b[31m%s\x1b[0m', `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`)
      awsResources.ECSName = null
      return true
    }
    if (JSON.parse(clusterDescription.stdout).clusters.length == 0) {
      console.warn('\x1b[31m%s\x1b[0m', `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`)
      awsResources.ECSName = null
      return true
    } else {
      JSON.parse(clusterDescription.stdout).clusters.forEach((c) => {
        if (c.clusterName == awsResources.ECSName) {
          clustersToKill.push(c.clusterArn)
        }
      })
      if (clustersToKill.length == 0) {
        console.warn('\x1b[31m%s\x1b[0m', `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`)
        awsResources.ECSName = null
        return true
      }  
    }
  }
  console.log(`Deleting these ECS clusters: ` + clustersToKill.join(', '))

  console.log(`Stopping ECS services.`)
  await Promise.all(
    clustersToKill.map(async (c) => {
      let aTaskToKill
      try {
        aTaskToKill = await exec(`aws ecs list-tasks --cluster ${c} --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to list tasks for cluster ${c}.`)
        throw e
      }
      let tasksToKill = JSON.parse(aTaskToKill.stdout).taskArns
      let killedTasks
      if (tasksToKill.length > 0) {
        killedTasks = Promise.all(
          tasksToKill.map((t) => {
            console.log(`killing task: ` + t)
            return exec(`aws ecs stop-task --cluster ${c} --task ${t} --profile ${useIAM}`)
          }
        ))
      }
      killedTasks = await killedTasks

      //wait for tasks to stop
      while (true) {
        let aTaskToKill
        try {
          aTaskToKill = await exec(`aws ecs list-tasks --cluster ${c} --profile ${useIAM}`)
        } catch (e) {
          console.error(`Unable to list tasks for cluster ${c}.`)
          throw e
        }

        tasksToKill = JSON.parse(aTaskToKill.stdout).taskArns

        if (tasksToKill.length === 0) {
          console.log('All tasks have stopped.')
          break
        }

        console.log(`Waiting for ${tasksToKill.length} tasks to stop...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    async function deleteAllServices(clusterName, useIAM) {
      let servicesToDelete = []
      let deletedServices = []
      let aServiceToDelete
    
      try {
        aServiceToDelete = await exec(`aws ecs list-services --cluster ${clusterName} --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to list services for cluster ${clusterName}.`)
        throw e
      }
    
      servicesToDelete = JSON.parse(aServiceToDelete.stdout).serviceArns
    
      if (servicesToDelete.length > 0) {
        deletedServices = Promise.all(
          servicesToDelete.map((s) => {
            console.log(`deleting service: ` + s)
            return exec(`aws ecs delete-service --cluster ${clusterName} --service ${s} --force --profile ${useIAM}`)
          })
        )
      }
    
      await deletedServices
      // Wait for services to be deleted
      while (true) {
        let servicesList
        try {
          servicesList = await exec(`aws ecs list-services --cluster ${clusterName} --profile ${useIAM}`)
        } catch (e) {
          console.error(`Unable to list services for cluster ${clusterName}.`)
          throw e
        }

        servicesToDelete = JSON.parse(servicesList.stdout).serviceArns

        if (servicesToDelete.length === 0) {
          console.log('All services have been deleted.')
          break
        }

        console.log(`Waiting for ${servicesToDelete.length} services to be deleted...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }

      console.log('All services have been deleted.')
      return true
    }
    
    return deleteAllServices(c, useIAM)
    })
  )
  let killedClusters = clustersToKill.map(async (c) => {
    console.log(`Deleting ECS Cluster ${c}.`)
    try {
      temp = exec(`aws ecs delete-cluster --profile ${useIAM} --cluster ${c}`)
    } catch (e) {
      console.error(`Unable to delete cluster ${c}.`)
      console.error(e)
    }
    return temp
  })
  return killedClusters
}

const dbsToDeleteFunc = async (useIAM, killTag, awsResources) => {
    // Get list of DBs to delete
    let dbs = []
    let respDBList
    try {
      respDBList = await exec(`aws rds describe-db-instances --profile ${useIAM}`)
    } catch(e) {
      console.error(`Unable to list databases`)
      throw e
    }
    JSON.parse(respDBList.stdout).DBInstances.forEach((db) => {
      if (!killTag) {
        //kill them all
        dbs.push(db.DBInstanceIdentifier)
      } else {
        if (db.TagList.length>0){
          db.TagList.forEach((tag) => {
            if (tag.Key == "PUSHKIN" & tag.Value == killTag) {
              dbs.push(db.DBInstanceIdentifier)
            }
          })
        }
      }
    })
    return dbs
  }

const deleteDatabases = async (dbs, useIAM, killTag) => {
  dbs = await dbs

  if (dbs.length == 0 ){
    console.log(`No databases to delete.`)
    return true
  }
  console.log(`Removing deletion protection from databases ${dbs}.`)
  await Promise.all([
    dbs.forEach((db) => {
    let temp
    try {  
      temp = execSync(`aws rds describe-db-instances --db-instance-identifier ${db} --profile ${useIAM}`)
    } catch (e) {
      console.warn('\x1b[31m%s\x1b[0m', `Unable to find database ${db}. Possibly it was already deleted.`)
      let tempFunc = (x) => {
        return x.filter((d) => {return (d != db)}) // remove from list
      } 
      dbs = tempFunc(dbs)
      return
    }
    return exec(`aws rds modify-db-instance --db-instance-identifier ${db} --no-deletion-protection --apply-immediately --profile ${useIAM}`)

    })
  ])

  console.log(`Deleting databases`)

  const checkDatabases = (dbId) => {
    let temp
    console.log(`Checking database ${dbId} for deletion protection`)
    try {
      temp = execSync(`aws rds describe-db-instances --db-instance-identifier ${dbId} --profile ${useIAM}`).toString()
    } catch (e) {
      console.error(`Unable to get information for db ${dbId}. Possibly it was already deleted. Skipping`)
      return
    }
    if (temp != "") {
      return (JSON.parse(temp).DBInstances[0].DeletionProtection == false)
    } else {
      return false
    }
  }

  const wait = async () => {
    //Sometimes, I really miss loops
    let checked = dbs.map((db) => {checkDatabases(db)})
    if (checked.includes(false)) {
      console.log('Waiting for DBs to be deletable...')
      setTimeout( wait, 20000 );
    } else {
      return Promise.all([dbs.map(async (db) => {
        //check whether DB is already being deleted
        let dbStatus
        try {
          dbStatus = await exec(`aws rds describe-db-instances --db-instance-identifier ${db} --profile ${useIAM}`)
        } catch (e) {
          console.error(`Unable to get information about ${db}`)
          console.error(e)
        }
        if (JSON.parse(dbStatus.stdout).DBInstances[0].DBInstanceStatus != "deleting") {
          let dbDeletionResponse
          console.log(`Deleting database ${db}`)
          try {
            dbDeletionResponse = exec(`aws rds delete-db-instance --db-instance-identifier ${db} --skip-final-snapshot --profile ${useIAM}`)
          } catch (e) {
            if (e.message.includes("already being deleted")) {
              console.warn('\x1b[31m%s\x1b[0m', `Database ${db} already being deleted.`)
              return true
            } else {
              console.error(`Uncaught db deletion error: ` + e)
              throw e
            }
          }
        }
      })])
    }
    console.log("really shouldn't ever get to this line of wait()!")
  }

  try {
    await wait();
  } catch (e) {
    throw e
  }

  //now, wait for them to be deleted
  const wait2 = async () => {
    //Sometimes, I really miss loops
    return new Promise((resolve, reject) => {
      const confirmDBDeleted = () => {
        let temp
        try {
          temp = execSync(`aws rds describe-db-instances --profile ${useIAM}`).toString()
        } catch (e) {
          console.error(`Unable to get list of databases`)
          throw e
        }
        return (JSON.parse(temp).DBInstances.length == 0)
      }
      let confirmedDeleted
      try {
        confirmedDeleted = confirmDBDeleted()
      } catch (e) {
        throw e
      }
      if (confirmedDeleted){
        console.log(`Databases confirmed deleted`)
        resolve(true)        
      } else {
        console.log('Waiting for DBs to be deleted...')
        setTimeout( wait2, 20000 );
      }
      //console.log("really shouldn't ever get to this line of wait2()!")
    })
  }

  return wait2()
}

const deleteLoadBalancer = async (useIAM, killTag) => {
  //FUBAR Need to killize this
  let temp
  try {
    temp = await exec(`aws elbv2 describe-load-balancers --profile ${useIAM}`)
  } catch(e) {
    console.warn('\x1b[31m%s\x1b[0m', `Unable to find any load balancers. May have already been deleted. Skipping.`)
    return
  }
  let balancersToDelete = []
  JSON.parse(temp.stdout).LoadBalancers.forEach((l) => {
    balancersToDelete.push(l.LoadBalancerArn)
  })
  return Promise.all(balancersToDelete.map(async (b) => {
    console.log(`Deleting load balancer ${b}`)
    async function deleteAllListeners(loadBalancerName, useIAM) {
      let listenersToDelete = []
      let deletedListeners = []
      let temp
    
      try {
        temp = await exec(`aws elbv2 describe-listeners --load-balancer-arn ${loadBalancerName} --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to list listeners for load balancer ${loadBalancerName}.`)
        throw e
      }
    
      listenersToDelete = JSON.parse(temp.stdout).Listeners.map((l) => l.ListenerArn)
    
      if (listenersToDelete.length > 0) {
        deletedListeners = Promise.all(
          listenersToDelete.map((l) => {
            console.log(`deleting listener: ` + l)
            return exec(`aws elbv2 delete-listener --listener-arn ${l} --profile ${useIAM}`)
          })
        )
      }
    
      deletedListeners = await deletedListeners
    
      // Wait for listeners to be deleted
      while (true) {
        let describedListeners
        try {
          describedListeners = await exec(`aws elbv2 describe-listeners --load-balancer-arn ${loadBalancerName} --profile ${useIAM}`)
        } catch (e) {
          console.error(`Unable to list listeners for load balancer ${loadBalancerName}.`)
          throw e
        }
    
        listenersToDelete = JSON.parse(describedListeners.stdout).Listeners.map((l) => l.ListenerArn)
    
        if (listenersToDelete.length === 0) {
          console.log('All listeners have been deleted.')
          break
        }
    
        console.log(`Waiting for ${listenersToDelete.length} listeners to be deleted...`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }

      return true
    }
    
    await deleteAllListeners(b, useIAM)      

    let deletedLoadBalancer
    try {
      deletedLoadBalancer = exec(`aws elbv2 delete-load-balancer --load-balancer-arn ${b} --profile ${useIAM}`)
    } catch (e) {
      console.error(`Unable to delete load balancer ${b}`)
      console.error(e)
    }    
  }))

  return deletedLoadBalancer //just to return something
}

const deleteCloudFront = async (useIAM, projName, killTag) => {

  // First, get list of distributions we need to delete
  let tempDists
  try {
    tempDists = await exec(`aws cloudfront list-distributions --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to get list of cloudfront distributions`)
    throw e
  }
  if (!tempDists.stdout) {
    console.log(`No cloudfront distributions found. Skipping.`)
    return true;
  } else {
    //found something
    let distributions = [];
    JSON.parse(tempDists.stdout).DistributionList.Items.forEach((d) => {
      if (killTag) {
        //check whether this is tagged to our project
        let tempTagCheck
        try {
          tempDists = execSync(`aws cloudfront list-tags-for-resource --resource ${d.ARN} --profile ${useIAM}`).toString()
        } catch (e) {
          console.error(`Unable to get tags for cloudfront distribution ${d.ARN}`)
          throw e
        }
        JSON.parse(tempDists).Tags.Items.forEach((t) => {
          if (t.Key == "PUSHKIN" & t.Value == projName) {
            distributions.push(d.Id)
          }
        })
      } else {
        //kill them all
        distributions.push(d.Id)
      }
    })

    const checkCloudFront = async (distId) => {
      let distributionExists = false;
      let distributionReady = false;
      let temp
      try {
        temp = await exec(`aws cloudfront list-distributions --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to get list of cloudfront distributions`)
        throw e
      }
      if (temp.stdout != "") {
        JSON.parse(temp.stdout).DistributionList.Items.forEach((d) => {
          let tempCheck = false;
          try {
            tempCheck = (d.Id == distId)
          } catch (e) {
            // Probably not a fully created cloudfront distribution.
            // Probably can ignore this. 
            console.warn('\x1b[31m%s\x1b[0m', `Problem reading cloudFront distribution information.`)
            throw e
          }
          if (tempCheck) {
            distributionReady = ((d.Enabled == false) & (d.Status != "InProgress"))
            distributionExists = true
          }
        })    
      }
      if (!distributionExists) {
        console.error(`Unable to find cloudfront distribution ${distId}. That is very strange.`)
      }
      return distributionReady
    }

    // Now, disable and delete each distribution
    return Promise.all(distributions.map(async (distId) => {
      let cloudConfig
      let ETag
      let aDistributionConfig
      try {
        aDistributionConfig = await exec(`aws cloudfront get-distribution-config --id ${distId} --profile ${useIAM}`)
        cloudConfig = JSON.parse(aDistributionConfig.stdout).DistributionConfig
        ETag = JSON.parse(aDistributionConfig.stdout).ETag
      } catch (e) {
        console.log(`Cannot find cloudfront distribution ${distId}. May have already been deleted. Skipping.`)      
        return true
      }
  
      // disableCloudfront.Enabled = false
      // disableCloudfront.CallerReference = cloudConfig.CallerReference
      // disableCloudfront.Origins.Items[0].Id = cloudConfig.Origins.Items[0].Id
      // disableCloudfront.Origins.Items[0].DomainName = cloudConfig.Origins.Items[0].DomainName
      // disableCloudfront.Origins.Items[0].DomainName = cloudConfig.Origins.Items[0].DomainName
      // disableCloudfront.DefaultCacheBehavior.TargetOriginId = cloudConfig.DefaultCacheBehavior.TargetOriginId
      cloudConfig.Enabled = false //This is the only thing to update
      console.log(`Disabling cloudfront distribution ` + distId)  

      let disableCloudFront
      let disableCommand = `aws cloudfront update-distribution \
      --id ${distId} \
      --if-match ${ETag} \
      --distribution-config '${JSON.stringify(cloudConfig)}' --profile ${useIAM}`
      try {
        disableCloudFront = await exec(disableCommand)        
      } catch (e) {
        console.error(`Possibly unable to disable cloudfront distribution ${distId}.\n Sometimes this throws errors but works anyway, so we'll continue and see what happens...\n`)
        console.log(`Tried :`, disableCommand)
      }

      return new Promise((resolve, reject) => {
        const wait = async () => {
          //Sometimes, I really miss loops
          let aDistributionConfig
          let x = await checkCloudFront(distId)
          if (x) {
            console.log(`Cloudfront is disabled. Deleting.`)
            //Apparently the ETag changes after disabling? So we need to get it again.
            try {
              aDistributionConfig = await exec(`aws cloudfront get-distribution-config --id ${distId} --profile ${useIAM}`)
              cloudConfig = JSON.parse(aDistributionConfig.stdout).DistributionConfig
              ETag = JSON.parse(aDistributionConfig.stdout).ETag
            } catch (e) {
              console.log(`Suddenly can't find cloudfront distribution ${distId}. Which is very strange, since we haven't deleted it yet. Skipping for now...`)      
              resolve(true)
            }
            //Armed with the new ETag, we can delete the distribution
            try {
              await exec(`aws cloudfront delete-distribution --id ${distId} --if-match ${ETag} --profile ${useIAM}`)
            } catch (e) {
              console.error(`Unable to delete cloudfront distribution`)
              try {
                resolve(exec(`aws cloudfront get-distribution --id ${distId} --profile ${useIAM}`))
              } catch (e) {
                console.error(e)
                if (JSON.parse(aDistributionConfig.stdout).Distribution.Status != "InProgress") {
                  console.error(`Unable to delete cloudfront distribution. It may be worth running pushkin aws armageddon again.`)
                  resolve(false)
                }
              }
              console.error(e)
            }
            try {
              let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
              awsResources.cloudFrontId = null
              fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
            } catch (e) {
              console.error(`Unable to update awsResources.js`)
              console.error(e)
            }    
            resolve(true)
          } else {
            console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`)
            setTimeout( wait, 30000 );
          }
        }

        console.log(`Waiting for cloudfront distribution ${distId} to be disabled...`)
        wait();
      })
    }))
  }
}

const deleteResourceRecords = async (useIAM, killTag, projName) => {
  let temp
  let pushkinConfig
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.load(temp)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e;
  }
  let myDomain = pushkinConfig.info.rootDomain

  console.log(`Deleting resource records for ${myDomain}`)

  let zoneID
  let listedHostedZones
  try {
    listedHostedZones = await exec(`aws route53 list-hosted-zones-by-name --dns-name ${myDomain} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to retrieve hostedzone for ${myDomain}`)
    throw e
  }
  if (JSON.parse(listedHostedZones.stdout).HostedZones.length == 0) {
    console.warn(`No hostedzone found for ${myDomain}`)
    //skip deleting resource records
    return true
  }
  try {
    zoneID = JSON.parse(listedHostedZones.stdout).HostedZones[0].Id.split("/hostedzone/")[1]
  } catch (e) {
    console.error(`Unable to parse hostedzone for ${myDomain}`)
    throw e
  }

  let resourceRecords = {
    "HostedZoneId": zoneID,
    "ChangeBatch": {
        "Comment": "",
        "Changes": []
    }
  }

  let tempRRList
  try {
    tempRRList = await exec(`aws route53 list-resource-record-sets --hosted-zone-id ${zoneID} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to retrieve resource records for ${myDomain}`)
    throw e
  }
  JSON.parse(tempRRList.stdout).ResourceRecordSets.forEach((rr) => {
    if (rr.SetIdentifier == projName | (!killTag & rr.SetIdentifier)) {
      let recordSet = {
        "Action": "DELETE",
        "ResourceRecordSet": rr
      }
      resourceRecords.ChangeBatch.Changes.push(recordSet)
    }
  })
  if (resourceRecords.ChangeBatch.Changes.length > 0) {
    return exec(`aws route53 change-resource-record-sets --cli-input-json '${JSON.stringify(resourceRecords)}' --profile ${useIAM}`)
  } else {
    return true
  }
}

const deleteOACs = async (useIAM, deletedCloudFront, killTag) => {
  //FUBAR Need to killize this
  deletedCloudFront = await deletedCloudFront
  let temp
  try {
    temp = await exec(`aws cloudfront list-origin-access-controls --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to get list of origin access controls`)
    throw e
  }
  if (temp.stdout != "" && JSON.parse(temp.stdout).OriginAccessControlList.Items) {
    JSON.parse(temp.stdout).OriginAccessControlList.Items.forEach((d) => {
      let etag
      let awsCommand = `aws cloudfront get-origin-access-control --id ${d.Id} --profile ${useIAM}`
      try {
        etag = execSync(awsCommand).toString()
      } catch (e) {
        console.error(`Unable to get etag for origin access control ${d.Id}`)
        console.error(`This command failed: ${awsCommand}`)
        throw e
      }
      let deleteOAC
      let deleteOACcommand = `aws cloudfront delete-origin-access-control --id ${d.Id} --if-match ${JSON.parse(etag).ETag} --profile ${useIAM}`
      try {
        deleteOAC = execSync(deleteOACcommand).toString()
      } catch (e) {
        console.error(`Unable to delete origin access control ${d.Id}`)
        console.error(`This command failed: ${deleteOACcommand}`)
        console.error(e)
        throw e
      }
      console.log(`Updating awsResources with cloudfront info`)
      try {
        let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
        awsResources.OAC = null
        fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
      } catch (e) {
        console.error(`Unable to update awsResources.js`)
        console.error(e)
      }        
    })
  }
  return true
}

const deleteTargetGroup = async (useIAM, deletedLoadBalancer) => {
  //FUBAR Need to killize this
  await deletedLoadBalancer
  let getTargetGroups
  try {
    getTargetGroups = await exec(`aws elbv2 describe-target-groups --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to list target groups`)
    throw e
  }
  let targetGroups = JSON.parse(getTargetGroups.stdout).TargetGroups.map((tg) => {return tg.TargetGroupArn})
  if (targetGroups.length > 0) {
    return Promise.all(targetGroups.map(async (tg) => {      
      try {
        await exec(`aws elbv2 describe-target-groups --target-group-arns ${tg} --profile ${useIAM}`)
      } catch (e) {
        console.warn('\x1b[31m%s\x1b[0m', `Unable to find target group ${tg}. May have already been deleted. Skipping.`)
        return true
      }
      let aDeletedTargetGroup
      try {
        aDeletedTargetGroup = exec(`aws elbv2 delete-target-group --target-group-arn ${tg} --profile ${useIAM}`)
      } catch (e) {
        console.error(`Unable to delete associated target group`)
        console.error(e)
      }
    }))  
  } else {
    console.log(`No target group. Skipping.`)
    return true
  }
}

const deleteBucket = async (useIAM, killTag, awsResources, deletedCloudFront) => {
  await deletedCloudFront
  //FUBAR Need to killize this
  let buckets
  try {
    buckets = await exec(`aws s3api list-buckets --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to list buckets`)
    throw e
  }
  if (JSON.parse(buckets.stdout).Buckets.length > 0) {
    return Promise.all([JSON.parse(buckets.stdout).Buckets.forEach(async (b) => {
      console.log(`Deleting s3 bucket ${b.Name}}`)
      try {
        await exec(`aws s3 rb s3://${b.Name} --force --profile ${useIAM}`)
      } catch (e) {
        console.warn(`Unable to delete s3 bucket ${awsResources.awsName}`)
      }
    }) ])      
  } else {
    console.log(`No s3 bucket. Skipping.`)
    return true
  }
}

const deleteSecurityGroups = async (useIAM, killTag, deletedDBs) => {
  console.log(`Before deleting security groups, wait for DBs to be completed deleted`)
  await deletedDBs
  console.log(`DBs deleted. Can start deleting security groups.`)
  const deleteMyGroup = async (g, useIAM, killTag) => {
    console.log(`Deleting security group ${g}`)
    let temp
    try {
      await exec(`aws ec2 describe-security-groups --group-names ${g} --profile ${useIAM}`)
    } catch (e) {
      console.log(e)
      console.log(`No security group ${g}.`)
      return true
    }
    try {
      temp = exec(`aws ec2 delete-security-group --group-name ${g} --profile ${useIAM}`)
    } catch(e) {
      console.warn('\x1b[31m%s\x1b[0m', `Unable to delete security group ${g}. PROBABLY this is because AWS needs something else to delete first.\n We recommend you retry 'pushkin aws armageddon' in a few minutes.`)
      console.warn('\x1b[31m%s\x1b[0m', e)
      return true
    }
    return temp
  }

  let groupsToDelete = []
  let tempGroupList
  try {
    tempGroupList = await exec(`aws ec2 describe-security-groups --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to list security groups`)
    throw e
  }
  JSON.parse(tempGroupList.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName!="default") { //can't delete the default!
      if (!killTag) {
        //kill them all
        groupsToDelete.push(g.GroupName)
      } else {
        if (g.Tags[0].Value==killTag) {
          groupsToDelete.push(g.GroupName)
        }
      }
    }
  })
  return Promise.all(groupsToDelete.map((g) => deleteMyGroup(g, useIAM, killTag)))
}

export const awsArmageddon = async (useIAM, killType) => {

  let temp, awsResources
  try {
    awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
  } catch (e) {
    console.error(`Unable to load awsResources.js`)
  }    
  let projName
  if (awsResources) {
    projName = awsResources.name; //can use this to identify resources needing deletion
  } else {
    if (killType == "kill") {
      console.warn('\x1b[31m%s\x1b[0m', `Unable to find awsResources.js. You won't be able to run kill.\n Either delete AWS deploy manually or run aws armageddon to delete everything including things not related to your project..`)
    }
  }
  const killTag = killType == "kill" ? projName : false
 
  const deletedStack = deleteStack(useIAM, killTag)

  let deletedCluster
  try {
    deletedCluster = deleteCluster(deletedStack, useIAM, killTag, projName, awsResources)    
  } catch(e) {
    console.warn('\x1b[31m%s\x1b[0m', e)
    //Don't exit. Might as well try deleting other things, too.
  }

  let deletedDBs, dbsToDelete 
  try {
    dbsToDelete = dbsToDeleteFunc(useIAM, killTag, awsResources)
  } catch(e) {
    console.warn('\x1b[31m%s\x1b[0m', e)
  }
  try {
    deletedDBs = deleteDatabases(dbsToDelete, useIAM, killTag)
  } catch(e) {
    console.warn('\x1b[31m%s\x1b[0m', e)
  }

  let deletedLoadBalancer 
  try {
    deletedLoadBalancer = deleteLoadBalancer(useIAM, killTag);
  } catch(e) {
    //Nothing
  }

  let deletedCloudFront 
  try {
    deletedCloudFront = deleteCloudFront(useIAM, projName, killTag);
  } catch(e) {
    //Nothing
  }

  let deletedResourceRecords
  try {
    deletedResourceRecords = deleteResourceRecords(useIAM, killTag, projName)
  } catch(e) {
    console.warn('\x1b[31m%s\x1b[0m', `Unable to delete resource records`)
    console.warn('\x1b[31m%s\x1b[0m', e) //don't fail on this
  }

  let deletedOACs
  try {
    deletedOACs = deleteOACs(useIAM, deletedCloudFront, killTag)
  } catch(e) {
    console.warn('\x1b[31m%s\x1b[0m', `Unable to delete origin access controls`)
    throw e
  }

  let deletedTargetGroup 
  try {
    deletedTargetGroup = deleteTargetGroup(useIAM, deletedLoadBalancer)    
  } catch(e) {
    //nothing
  }

  let deletedBucket 
  try {
    deletedBucket = deleteBucket(useIAM, killTag, awsResources, deletedCloudFront);
  } catch(e) {
    //nothing
  }

  let deletedGroups 
  try {
    deletedGroups = deleteSecurityGroups(useIAM, killTag, deletedDBs)
  } catch (e) {
    // Do nothing
  }

  //FUBAR Should we delete ACL as well?

  console.log(`Updating awsResources.js`)
  let awsResourcesNull = {
    name: projName,
    awsName: null,
    iam: useIAM,
    dbs: [],
    cloudFrontId: null,
    ECSName: null,
    OAC: null
  }
  // Remove undefined properties
  Object.keys(awsResourcesNull).forEach((key) => {
    if (awsResourcesNull[key] === undefined) {
      delete awsResourcesNull[key];
    }
  });
  try {
    await fs.promises.writeFile(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResourcesNull), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

  // Wait for everything to be deleted
  await Promise.all([ deletedGroups, deletedResourceRecords, deletedBucket, deletedCloudFront, deletedDBs, deletedLoadBalancer, deletedOACs, deletedCluster, deletedTargetGroup ]);

  console.log(`The following resources were either not deleted or are still in the process of being deleted:`)
  await awsList(useIAM)
  console.log(`
    If this list is non-empty but you expect it to be empty, wait 10 minutes and run 'pushkin aws list'.
    If the list is still non-empty, try re-running 'pushkin aws armageddon'.
    If 10 minutes after that, 'pushkin aws list' still returns a non-empty list and you don't know why, contact AWS support to ensure that you are not being charged for services you aren't using.`)

  return
}

export async function awsList(useIAM) {
  let temp

  temp = await exec(`aws rds describe-db-instances --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).DBInstances.length > 0) {
    console.log('DBInstances:\n', JSON.parse(temp.stdout).DBInstances)
  } 
  temp = await exec(`aws ecs describe-clusters --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).clusters.length > 0) {
    console.log('ECS Clusters:\n', JSON.parse(temp.stdout).clusters)
  } 
  temp = await exec(`aws ec2 describe-security-groups --profile ${useIAM}`)
  JSON.parse(temp.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName!="default") {
      console.log('Security Group:\n', g)
    }
  })
  temp = await exec(`aws elb describe-load-balancers --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).LoadBalancerDescriptions.length > 0) {
    console.log('Load Balancers:\n', JSON.parse(temp.stdout).LoadBalancerDescriptions)
  } 
  temp = await exec(`aws s3api list-buckets --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).Buckets.length > 0) {
    console.log('S3 Buckets:\n', JSON.parse(temp.stdout).Buckets)
  } 
  temp = await exec(`aws cloudfront list-distributions --profile ${useIAM}`)
  if (temp.stdout != '') {
    console.log('CloudFront Distributions:\n', JSON.parse(temp.stdout))
  } 
  temp = await exec(`aws cloudformation describe-stacks --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).Stacks.length > 0) {
    console.log('Cloudformation Stacks:\n', JSON.parse(temp.stdout).Stacks)
  } 
  temp = await exec(`aws rds describe-db-snapshots --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).DBSnapshots.length > 0) {
    console.log('DB Snapshots:\n', JSON.parse(temp.stdout).DBSnapshots)
  } 
  temp = await exec(`aws secretsmanager list-secrets --profile ${useIAM}`)
  if (JSON.parse(temp.stdout).SecretList.length > 0) {
    console.log('Secrets:\n', JSON.parse(temp.stdout).SecretList)
  } 
}

export const createAutoScale = async (useIAM, projName) => {
  const shortName = projName.replace(/[^A-Za-z0-9]/g, "")
  const snsName = shortName.concat("Alarms")
  let TopicArn, targGroupARN, ECSName, balancerARN, loadBalancerName, useEmail

  console.log('Reading config information to configure autoscaling and alarms')
  try {
    let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    ECSName = awsResources.ECSName
    targGroupARN = awsResources.targGroupARN
    loadBalancerName = awsResources.loadBalancerName
  } catch (e) {
    console.error(`Unable to read ECSName from awsResources.js`)
    throw e
  }    

  let alarmMainHigh = JSON.parse(JSON.stringify(alarmRDSHigh))
  let alarmTransactionHigh = JSON.parse(JSON.stringify(alarmRDSHigh))
  try {
    let temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    let config = jsYaml.load(temp)
    alarmMainHigh.Dimensions.Value = config.productionDBs.Main.name
    alarmTransactionHigh.Dimensions.Value = config.productionDBs.Transaction.name
    useEmail = config.info.email
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e;
  } 

  let describedLoadBalancers
  try {
    let describedLoadBalancers = await exec(`aws elbv2 describe-load-balancers --names ${loadBalancerName} --profile ${useIAM}`)
    balancerARN = JSON.parse(describedLoadBalancers.stdout).LoadBalancers[0].LoadBalancerArn
  } catch (e) {
    console.error(`Unable to find load balancer ARN`)
  }

  console.log('Creating SNS topic')

  try {
    // This action is idempotent, so if the requester already owns a topic with the specified name, that topic’s ARN is returned without creating a new topic.
    let temp = await exec(`aws sns create-topic --name ${snsName} --profile ${useIAM}`)
    TopicArn = JSON.parse(temp.stdout).TopicArn
  } catch (e) {
    console.error(`Unable to create SNS topic`)
    throw e
  }
  try {
    //Looks like this can be repeated
    let temp = await exec(`aws sns subscribe --topic-arn ${TopicArn} --protocol email --notification-endpoint ${useEmail} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to subscribe to SNS topic`)
    throw e
  }

  console.log('Registering cloudwatch alarms')
  alarmCPUHigh.AlarmActions = TopicArn
  alarmCPUHigh.Dimensions.Value = ECSName
  alarmCPUHigh.AlarmName = shortName.concat("alarmCPUHigh")
  let setAlarmCPUHigh
  try {
    setAlarmCPUHigh = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarmCPUHigh.AlarmName} --cli-input-json ${JSON.stringify(alarmCPUHigh)} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmCPUHigh.AlarmName}`)
    throw e
  }

  alarmRAMHigh.AlarmActions = TopicArn
  alarmRAMHigh.Dimensions.Value = ECSName
  alarmRAMHigh.AlarmName = shortName.concat("alarmRAMHigh")
  let setAlarmRAMHigh
  try {
    setAlarmRAMHigh = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarmRAMHigh.AlarmName} --cli-input-json ${JSON.stringify(alarmRAMHigh)} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmRAMHigh.AlarmName}`)
    throw e
  }

  alarmMainHigh.AlarmActions = TopicArn
  alarmMainHigh.AlarmName = shortName.concat('Main').concat("alarmRAMHigh")
  alarmTransactionHigh.AlarmActions = TopicArn
  alarmTransactionHigh.AlarmName = shortName.concat('Transaction').concat("alarmRAMHigh")

  try {
    dbAlarmMain = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarmMainHigh.AlarmActions} --cli-input-json ${JSON.stringify(alarmMainHigh)} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmMainHigh.AlarmName}`)
    throw e
  }
  try {
    dbAlarmTransaction = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarmTransactionHigh.AlarmActions} --cli-input-json ${JSON.stringify(alarmTransactionHigh)} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to set cloudwatch alarm ${alarmTransactionHigh.AlarmName}`)
    throw e
  }

  console.log(`Finding autoscaling launch configuration`)
  let asGroup
  try {
    let temp = await exec(`aws autoscaling describe-auto-scaling-groups --profile ${useIAM}`)
    JSON.parse(temp.stdout).AutoScalingGroups.forEach((l) => {
      if (l.AutoScalingGroupName.search(shortName)){
        asGroup = l.AutoScalingGroupName
      }
    })
  } catch (e) {
    console.log(`Unable to find launch configuration name`)
    throw e
  }

  try {
    await exec(`aws autoscaling update-auto-scaling-group --auto-scaling-group-name ${asGroup} --min-size 2 --max-size 10 --desired-capacity 2 --profile ${useIAM}`)
    await exec(`aws autoscaling attach-load-balancer-target-groups --auto-scaling-group-name ${asGroup} --target-group-arns ${targGroupARN} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to update settings for autoscaling group`)
    throw e
  }

  const label1 = balancerARN.split("loadbalancer/")[1]
  const label2 = "/targetgroup".concat(targGroupARN.split("targetgroup")[1])
  scalingPolicyTargets.PredefinedMetricSpecification.ResourceLabel = label1.concat(label2)

  let alarmUp
  let alarmDown
  let policyARN
  try {
    let temp = await exec(`aws autoscaling put-scaling-policy --policy-name MyPushkinPolicy --auto-scaling-group-name ${asGroup} --policy-type TargetTrackingScaling --target-tracking-configuration ${scalingPolicyTargets} --profile ${useIAM}`)
    alarmUp = JSON.parse(temp.stdout).Alarms[0]
    alarmDown = JSON.parse(temp.stdout).Alarms[1]
    policyARN = JSON.parse(temp.stdout).PolicyARN
  } catch (e) {
    console.error(`Unable to make autoscaling policy`)
    throw e
  }

  console.log(`Updating awsResources with autoscaling info`)
  try {
    let awsResources = jsYaml.load(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsResources.alarmUp = alarmUp
    awsResources.alarmDown = alarmDown
    awsResources.policyARN = policyARN
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.dump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    throw e
  }    

  // try {
  //   let temp1 = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarm1.AlarmName} --alarm-actions ${TopicArn} --evaluation-periods 3 --comparison-operator LessThanThreshold --profile ${useIAM}`)
  //   let temp2 = exec(`aws cloudwatch put-metric-alarm --alarm-name ${alarm1.AlarmName} --alarm-actions ${TopicArn} --comparison-operator GreaterThanThreshold --profile ${useIAM}`)
  //   await Promise.all([ temp1, temp2 ])
  // } catch (e) {
  //   console.log(`unable to subscribe to alarms`)
  //   throw e
  // }

  return Promise.all([ dbAlarmTransaction, dbAlarmMain, setAlarmRAMHigh, setAlarmCPUHigh])
}

