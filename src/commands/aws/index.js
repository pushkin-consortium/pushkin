import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import util from 'util';
import pacMan from '../../pMan.js'; //which package manager is available?
import { execSync } from 'child_process'; // eslint-disable-line
import jsYaml from 'js-yaml';
import { pushkinACL, OriginAccessControl, policy, cloudFront, dbConfig, rabbitTask, apiTask, workerTask, changeSet, corsPolicy, disableCloudfront, alarmRAMHigh, alarmCPUHigh, alarmRDSHigh, scalingPolicyTargets } from './awsConfigs.js'
import { setupTransactionsDB, runMigrations, getMigrations } from '../setupdb/index.js';
import { updatePushkinJs } from '../prep/index.js'
import inquirer from 'inquirer'
const exec = util.promisify(require('child_process').exec);
const mkdir = util.promisify(require('fs').mkdir);

const publishToDocker = function (DHID) {
  console.log('Publishing images to DockerHub')
  console.log("Building API")
  try {
    execSync(`docker build -t ${DHID}/api:latest pushkin/api`, {cwd: process.cwd()})
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

  let docker_compose
  try {
    docker_compose = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'), 'utf8'));
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

    console.log(`Building ${s}`)
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

export const syncS3 = async (awsName, useIAM) => {
  console.log("Syncing files to bucket")
  try {
    return exec(`aws s3 sync build/ s3://${awsName} --profile ${useIAM}`, {cwd: path.join(process.cwd(), 'pushkin/front-end')})
  } catch(e) {
    console.error(`Unable to sync local build with s3 bucket`)
    throw e
  }  
}

const deployFrontEnd = async (projName, awsName, useIAM, myDomain, myCertificate) => {
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
        console.warning(`Found an incompletely-specified cloudFront distribution. This may not be a problem, but you should check.`)
        console.warning(`Worst-case scenario, run 'pushkin aws armageddon' and start over.`)
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
    myCloudFront.Origins.Items[0].OriginAccessControlId = await OAC; //we'll need this before continuing.
    myCloudFront.WebACLId = await ACLarn; //we'll need this before continuing.
    myCloudFront.CallerReference = awsName;
    myCloudFront.DefaultCacheBehavior.TargetOriginId = awsName;
    myCloudFront.Origins.Items[0].Id = awsName;
    myCloudFront.Origins.Items[0].DomainName = awsName.concat('.s3.amazonaws.com');
    if (myDomain != "default") {
      // set up DNS
      myCloudFront.Aliases.Quantity = 2
      myCloudFront.Aliases.Items = [myDomain, 'www.'.concat(myDomain)]
      myCloudFront.ViewerCertificate.CloudFrontDefaultCertificate = false
      myCloudFront.ViewerCertificate.ACMCertificateArn = myCertificate
      myCloudFront.ViewerCertificate.SSLSupportMethod = 'sni-only'
      myCloudFront.ViewerCertificate.MinimumProtocolVersion = 'TLSv1.2_2019'
    }
    try {
      myCloud = await exec(`aws cloudfront create-distribution --distribution-config '`.concat(JSON.stringify(myCloudFront)).concat(`' --profile ${useIAM}`))
      theCloud = JSON.parse(myCloud.stdout).Distribution 
    } catch (e) {
      console.log('Could not set up cloudfront.')
      throw e
    }


    console.log("Setting bucket permissions")
    // FUBAR: commented out CORS and aws s3 website. Do we still need them?
    //  let myCORSPolicy = JSON.parse(JSON.stringify(corsPolicy)) 
    //  myCORSPolicy.Bucket = awsName 
      policy.Statement[0].Resource = "arn:aws:s3:::".concat(awsName).concat("/*")
      policy.Statement[0].Resource.Condition["AWS:SourceArn"] = theCloud.ARN
      try {
    //    await exec(`aws s3 website s3://${awsName} --profile ${useIAM} --index-document index.html --error-document index.html`) //https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3/website.html
        await exec(`aws s3api put-bucket-policy --bucket `.concat(awsName).concat(` --policy '`).concat(JSON.stringify(policy)).concat(`' --profile ${useIAM}`))
    //    await exec(`aws s3api put-bucket-cors --cli-input-json '${JSON.stringify(myCORSPolicy)}' --profile ${useIAM}`)
      } catch (e) {
        console.error('Problem setting bucket permissions for front-end')
        throw e
      }
    
    console.log(`Updating awsResources with cloudfront info`)
    try {
      let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
      awsResources.cloudFrontId = theCloud.Id
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
    } catch (e) {
      console.error(`Unable to update awsResources.js`)
      console.error(e)
    }    
  }

  if (myDomain != "default") {
    console.log(`Retrieving hostedzone ID for ${myDomain}`)
    let zoneID
    try {
      temp = await exec(`aws route53 list-hosted-zones-by-name --dns-name ${myDomain} --profile ${useIAM}`)
      zoneID = JSON.parse(temp.stdout).HostedZones[0].Id.split("/hostedzone/")[1]
    } catch (e) {
      console.error(`Unable to retrieve hostedzone for ${myDomain}`)
      throw e
    }

    // The following will update the resource records, creating them if they don't already exist

    console.log(`Updating record set for ${myDomain}`)
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

    recordSet.Changes[1].ResourceRecordSet.Name = myDomain
    recordSet.Changes[1].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
    recordSet.Changes[1].ResourceRecordSet.Type = "AAAA"

    recordSet.Changes[2].ResourceRecordSet.Name = "www.".concat(myDomain) //forward from www
    recordSet.Changes[2].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
    recordSet.Changes[2].ResourceRecordSet.Type = "A"

    recordSet.Changes[3].ResourceRecordSet.Name = "www.".concat(myDomain) //forward from www
    recordSet.Changes[3].ResourceRecordSet.AliasTarget.DNSName = theCloud.DomainName
    recordSet.Changes[3].ResourceRecordSet.Type = "AAAA"

    try {
      await exec(`aws route53 change-resource-record-sets --hosted-zone-id ${zoneID} --change-batch '${JSON.stringify(recordSet)}' --profile ${useIAM}`)
      console.log(`Updated record set for ${myDomain}.`)
     } catch (e) {
      console.error(`Unable to create resource record set for ${myDomain}`)
      throw e
    }
  }

  await syncMe
  console.log(`Finished syncing files`)

  return theCloud.DomainName
}

const getOAC = async (useIAM) => {
  const createOAC = async (useIAM) => {
    try {
      temp = exec('aws cloudfront create-origin-access-control --origin-access-control-config'.concat(JSON.stringify(OriginAccessControl)).concat(` --profile ${useIAM}`))
    } catch (error) {
      console.error(`Unable to create Origin Access Control`)
      throw error
    }
    return Promise(temp.OriginAccessIdentify.Id)
  }

  console.log(`Checking to see if OAC already exists.`)

  let awsResources
  try {
    awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
  } catch (e) {
    console.error(`Unable to read awsResources.js. That's strange.`)
    console.error(e)
    throw e
  } 

  let needOAC = false;

  if (!awsResources.OAC) {
    console.log(`No origin access control. Creating.`)
    needOAC = true;
  } else {
    try {
      temp = await exec(`aws cloudfront get-origin-access-control --id ${awsResources.OAC} --profile ${useIAM}`)
    } catch (e) {
      console.log(`Huh. I can't find that OAC. Making a new one.`)
      needOAC = true;
    }
  }

  if (needOAC) {
    awsResources.OAC = await createOAC();
    try {
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');  
    } catch (error) {
      console.error(`Can't write to awsResources.js. That's strange.`)
      throw error
    }
  }

  return Promise(awsResources.OAC)
}

const initDB = async (dbType, securityGroupID, projName, awsName, useIAM) => {
  console.log(`Creating ${dbType} database.`)
  let stdOut, dbName, dbPassword
  dbName = projName.concat(dbType).replace(/[^A-Za-z0-9]/g, "")

  //First, check to see if database exists
  try {
     stdOut = await exec(`aws rds describe-db-instances --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to get list of RDS databases`)
    throw e
  }
  let foundDB = false;
  JSON.parse(stdOut.stdout).DBInstances.forEach((db) => {
    if (db.DBInstanceIdentifier == dbName.toLowerCase()) {
      foundDB = true;
    }
  })
  if (foundDB) {
    console.log(`${dbName} already exists. If that surprises you, look into it.`)
    //Could consider putting an optional break in here, make people acknowledge before going on.
    return false;
  }

  //Updating list of AWS resources
  console.log('Updated awsResources with db information')
  try {
    let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    if (awsResources.dbs) {
      awsResources.dbs.push(dbName)
    } else {
      awsResources.dbs = [dbName]
    }
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

  dbPassword = Math.random().toString() //Pick random password for database
  let myDBConfig = JSON.parse(JSON.stringify(dbConfig));
  myDBConfig.DBName = dbName
  myDBConfig.DBInstanceIdentifier = dbName
  myDBConfig.VpcSecurityGroupIds = [securityGroupID]
  myDBConfig.MasterUserPassword = dbPassword
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
  
  const newDB = {
    "type": dbType,
    "name": dbName, 
    "host": dbEndpoint.DBInstances[0].Endpoint.Address, 
    "user": myDBConfig.MasterUsername, 
    "pass": myDBConfig.MasterUserPassword,
    "port": myDBConfig.Port
  }
  
  return newDB
}
 
const getDBInfo = async () => {
  let temp
  let pushkinConfig
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.safeLoad(temp)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e;
  }
  if (Object.keys(pushkinConfig.productionDBs).length >= 2 ) {
    let dbsByType = {}
    //fubar - just changed this to assume JSON. Might not be right.
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
          await fs.promises.writeFile(path.join(process.cwd(), 'ECStasks', yaml), jsYaml.safeDump(task), 'utf8');
        } catch (e) {
          console.error(`Unable to write ${yaml}`)
          throw e
        }
        let compose
        try {
          console.log(`Running ECS compose for ${name}`)
          let balancerCommand = (targGroupARN ? `--target-groups "targetGroupArn=${targGroupARN},containerName=${name},containerPort=${port}"` : '')
          let composeCommand = `ecs-cli compose -f ${yaml} -p ${yaml.split('.')[0]} service up --cluster-config ${ECSName} --scheduling-strategy DAEMON `.concat(balancerCommand)
          compose = exec(composeCommand, { cwd: path.join(process.cwd(), "ECStasks")})
        } catch (e) {
          console.error(`Failed to run ecs-cli compose service on ${yaml}`)
          throw e
        }
        return compose
      } else {
        console.log('...')
        setTimeout( wait, 10000 );
      }
    }

    console.log(`Updated awsResources with ECS information`)
    try {
      let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
      awsResources.ECSName = ECSName
      fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
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
  apiTask.services['api'].environment.AMQP_ADDRESS = rabbitAddress;
  apiTask.services['api'].image = `${DHID}/api:latest`

  let docker_compose
  try {
    docker_compose = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'), 'utf8'));
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
      task.services[w] = {}
      task.services[w].image = `${DHID}/${w}:latest`
      task.services[w].mem_limit = workerTask.services.EXPERIMENT_NAME.mem_limit
      //Note that "DB_USER", "DB_NAME", "DB_PASS", "DB_URL" are redundant with "DB_SMARTURL"
      //For simplicity, newer versions of pushkin-worker will expect DB_SMARTURL
      //However, existing deploys won't have that. So both sets of information are maintained
      //for backwards compatibility, at least for the time being. 
      task.services[w].environment = {
        "AMQP_ADDRESS" : rabbitAddress,
        "DB_USER": dbInfoByTask['Main'].username,
        "DB_NAME": dbInfoByTask['Main'].name,
        "DB_PASS": dbInfoByTask['Main'].password,
        "DB_URL": dbInfoByTask['Main'].endpoint,
        "TRANSACTION_DATABASE_URL": `postgres://${dbInfoByTask['Transaction'].username}:${dbInfoByTask['Transaction'].password}@${dbInfoByTask['Transaction'].endpoint}:/${dbInfoByTask['Transaction'].port}/${dbInfoByTask['Transaction'].name}`
      }
      task.services[w].command = workerTask.services["EXPERIMENT_NAME"].command
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
  const makeBalancerGroup = async(useIAM) => {
    console.log(`Creating security group for load balancer`)
    let SGCreate = `aws ec2 create-security-group --group-name BalancerGroup --description "For the load balancer" --profile ${useIAM}`
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
      madeBalancerGroup = makeBalancerGroup(useIAM) //start this process early. Will use much later. 
    } catch(e) {
      throw e
    }
  }

  //make security group for ECS cluster. Start this process early, though it doesn't take super long.
  const makeECSGroup = async(useIAM) => {
    console.log(`Creating security group for ECS cluster`)
    let SGCreate = `aws ec2 create-security-group --group-name ECSGroup --description "For the ECS cluster" --profile ${useIAM}`
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
      madeECSGroup = makeECSGroup(useIAM) //start this process early. Will use much later. 
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
    await fs.promises.writeFile(path.join(process.cwd(), 'ECStasks/ecs-params.yml'), jsYaml.safeDump(ecsParams), 'utf8')
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
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    temp = await exec(setProfile)
  } catch (e) {
    console.error(`Unable to set up profile ${useIAM} for ECS CLI.`)
    throw e
  }

  const nameCluster = `ecs-cli configure --region us-east-1 --cluster ${ECSName} --default-launch-type EC2 --config-name ${ECSName}`
  const setDefaultCluster = `ecs-cli configure default --config-name ${ECSName}`
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    temp = await exec(nameCluster)
    temp = await exec(setDefaultCluster)
  } catch (e) {
    console.error(`Unable to set default cluster ${ECSName} for ECS CLI.`)
    throw e
  }
  console.log(`ECS CLI configured`)

  let launchedECS
  await madeSSH //need this shortly
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
    const ecsCommand = `ecs-cli up --force --keypair my-pushkin-key-pair --capability-iam --size 1 --instance-type t2.small --cluster ${ECSName} --security-group ${ecsSecurityGroupID} --vpc ${myVPC} --subnets ${subnets.join(' ')} --ecs-profile ${useIAM}`
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
    let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsResources.loadBalancerName = loadBalancerName
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

  let madeBalancer
  try {
    madeBalancer = exec(`aws elbv2 create-load-balancer --name ${loadBalancerName} --type application --scheme internet-facing --subnets ${subnets.join(' ')} --security-groups ${BalancerSecurityGroupID} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to create application load balancer`)
    throw e
  }

  try {
    temp = await exec(`aws elbv2 create-target-group --name ${loadBalancerName.concat("Targets").slice(0,32)} --protocol HTTP --port 80 --vpc-id ${myVPC} --profile ${useIAM}`)
  } catch(e) {
    console.error(`Unable to create target group`)
    throw e
  }
  const targGroupARN = JSON.parse(temp.stdout).TargetGroups[0].TargetGroupArn
  try {
    console.log(`Updating awsResources.js with target group info`)
    let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsResources.targGroupARN = targGroupARN
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

  temp = await madeBalancer //need this for the next step
  const balancerARN = JSON.parse(temp.stdout).LoadBalancers[0].LoadBalancerArn
  const balancerEndpoint = JSON.parse(temp.stdout).LoadBalancers[0].DNSName
  const balancerZone = JSON.parse(temp.stdout).LoadBalancers[0].CanonicalHostedZoneId
  temp = await  exec(`aws elbv2 create-listener --load-balancer-arn ${balancerARN} --protocol HTTP --port 80  --default-actions Type=forward,TargetGroupArn=${targGroupARN} --profile ${useIAM}`)

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
  await createdECSTasks
  console.log(`Created ECS task definitions`)

  return [ balancerEndpoint, balancerZone]
}


const forwardAPI = async (myDomain, useIAM, balancerEndpoint, balancerZone) => {

  // This whole function can be skipped if not using custom domain
  // The API endpoint will have to be set manually
  if (myDomain != "default") {
    let temp
    console.log(`Retrieving hostedzone ID for ${myDomain}`)
    let zoneID
    try {
      temp = await exec(`aws route53 list-hosted-zones-by-name --dns-name ${myDomain} --profile ${useIAM}`)
      zoneID = JSON.parse(temp.stdout).HostedZones[0].Id.split("/hostedzone/")[1]
    } catch (e) {
      console.error(`Unable to retrieve hostedzone for ${myDomain}`)
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
    try {
      await exec(`aws route53 change-resource-record-sets --hosted-zone-id ${zoneID} --change-batch '${JSON.stringify(recordSet)}' --profile ${useIAM}`)
      console.log(`Updated record set for ${myDomain}.`)
     } catch (e) {
      console.error(`Unable to create resource record set for ${myDomain}`)
      throw e
    }
  }

  return
}

export async function awsInit(projName, awsName, useIAM, DHID) {
  let temp
  let pushkinConfig
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.safeLoad(temp)
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
    await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig), 'utf8')
    console.log(`Successfully updated pushkin.yaml with custom domain.`)
    updatePushkinJs()
  } catch(e) {
    throw e
  }

  //Databases take BY FAR the longest, so start them right after certificate (certificate comes first or things get confused)
  const createDatabaseGroup = async (useIAM) => {
    let SGCreate = `aws ec2 create-security-group --group-name DatabaseGroup --description "For connecting to databases" --profile ${useIAM}`
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

  let securityGroupID
  if (foundDBGroup) {
    console.log(`Database security group already exists. Skipping creation.`)
    securityGroupID = foundDBGroup
  } else {
    console.log('Creating security group for databases')
    securityGroupID = await createDatabaseGroup(useIAM)
  }

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

  const recordDBs = async(dbDone) => {
    const returnedPromises = await dbDone //initializedTransactionsDB must be first in this list
    const transactionDB = returnedPromises[0] //this is why it has to be first
    const mainDB = returnedPromises[1] //this is why it has to be second

    console.log(`Databases created. Adding to local config definitions.`)
    let pushkinConfig
    let stdOut;
    try {
      stdOut = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
      pushkinConfig = jsYaml.safeLoad(stdOut)
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
      stdOut = await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig), 'utf8')
      console.log(`Successfully updated pushkin.yaml with databases.`)
    } catch(e) {
      throw e
    }

   return pushkinConfig;
  }

  const completedDBs = recordDBs(Promise.all([initializedMainDB, initializedTransactionDB]))

  //pushing stuff to DockerHub
  let publishedToDocker
  try {
    publishedToDocker = publishToDocker(DHID);
  } catch(e) {
    console.error('Unable to publish images to DockerHub')
    throw e
  }

  //build front-end
  let builtWeb
  try {
    builtWeb = buildFE(projName)
  } catch(e) {
    throw e
  }

  await builtWeb; //need this before we sync! 

  let deployedFrontEnd
  try {
    deployedFrontEnd = deployFrontEnd(projName, awsName, useIAM, myDomain, myCertificate)
  } catch(e) {
    console.error(`Failed to deploy front end`)
    throw e
  }

  await publishedToDocker //need this to configure ECS
  let configuredECS
  try {
    configuredECS = setupECS(projName, awsName, useIAM, DHID, completedDBs, myCertificate);
  } catch(e) {
    throw e
  }

  const setupTransactionsWrapper = async () => {
    let info = await completedDBs
    let setupTransactionsTable
    try {
      setupTransactionsTable = setupTransactionsDB(info.productionDBs.Transaction);
    } catch (e) {
      throw e    
    }
    return setupTransactionsTable
  }
  let setupTransactionsTable
  try {
    setupTransactionsTable = setupTransactionsWrapper()
  } catch (e) {
    throw e
  }

  const migrationsWrapper = async () => {
    console.log(`Handling migrations`)
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
  let ranMigrations
  try {
    ranMigrations = migrationsWrapper();
  } catch (e) {
    throw e
  }

  let balancerEndpoint
  let balancerZone
  const forwardAPIWrapper = async () => {
    [ balancerEndpoint, balancerZone] = await configuredECS
    
    let apiForwarded
    try {
      apiForwarded = forwardAPI(myDomain, useIAM, balancerEndpoint, balancerZone)
    } catch(e) {
      console.error(`Unable to set up forwarding for API`)
      throw e
    }

    return apiForwarded
  }
  let apiForwarded
  try {
    apiForwarded = forwardAPIWrapper();
  } catch (e) {
    throw e
  }

  pushkinConfig = await completedDBs;

  await Promise.all([deployedFrontEnd, setupTransactionsTable, ranMigrations, apiForwarded])

  // This needs to come last, right before 'return'
  if (myDomain == "default") {
    let cloudDomain = await deployedFrontEnd //has actually already resolved, but not sure I can use it directly
    console.log(`Access your website at ${cloudDomain}`)
    console.log(`Be sure to update pushkin/front-end/src/config.js so that the api URL is ${balancerEndpoint}.`)
    pushkinConfig.info.rootDomain = cloudDomain
  }

  await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig), 'utf8')

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
    stdOut = fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
  } catch(e) {
    console.error(`Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }

  console.log("Resetting db info")
  try {
    temp = fs.readFileSync(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.safeLoad(temp)
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
      fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig), 'utf8')
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
  const findACL = (useIAM) => {
    let ACLarn, temp
    try {
      temp = execSync(`aws wafv2 list-web-acls --scope CLOUDFRONT --profile ${useIAM}`)
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
          console.warning(`Problem reading ACL list.`)
          throw e
        }
        if (tempCheck) {
          ACLarn = d.ARN
        }
      })    
    }
    return ACLarn
  }

  let ACLarn = findACL(useIAM);
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
    awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
  } catch(e) {
    console.error(`Could not read the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  awsResources.iam = iam;
  try {
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
  } catch(e) {
    console.error(`Could not write to the pushkin CLI's AWS config file. This is a very strange error. Please contact the dev team.`)
    throw e
  }
  return
}

export const awsArmageddon = async (useIAM) => {
  // docker run --rm -it -v /Users/jkhartshorne/Downloads/HomeSeer/config.yml:/home/aws-nuke/config.yml -v ~/.aws:/home/aws-nuke/.aws rebuy/aws-nuke --profile trialPushkin --config /home/aws-nuke/config.yml --no-dry-run  

// regions:
// - us-east-1

// account-blacklist:
// - "999999999999" # production

// resource-types:
//   # only nuke these resources
//   targets:
//   - S3Object
//   - S3Bucket
//   - ECSTaskDefinition
//   - ECSCluster
//   - ECSClusterInstance
//   - ECSService
//   - RDSInstance
//   - CloudFormationStack
//   - LaunchConfiguration
//   - EC2Volume
//   - EC2SecurityGroup
//   - EC2Instance
//   - ELBv2TargetGroup

// accounts:
//   "625162337273": {}

  let temp, awsResources
  try {
    awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
  } catch (e) {
    console.error(`Unable to load awsResources.js`)
  }    

  const deleteCluster = async() => {
    if (!awsResources.ECSName) {
      console.log(`No cluster. Skipping.`)
      return
    }

    try {
      temp = await exec(`aws ecs describe-clusters --clusters ${awsResources.ECSName} --profile ${useIAM}`)
    } catch (e) {
      console.warn(`Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`)
      awsResources.ECSName = null
      return
    }

    console.log(`Stopping ECS services.`)
    const yamls = fs.readdirSync(path.join(process.cwd(), 'ECSTasks'));
    temp = await Promise.all([
      yamls.forEach((yaml) => {
        if (yaml != "ecs-params.yml"){
          let composeCommand = `ecs-cli compose -f ${yaml} -p ${yaml.split('.')[0]} --cluster ${awsResources.ECSName} service rm --ecs-profile ${useIAM}`
          try {
           temp = exec(composeCommand, { cwd: path.join(process.cwd(), "ECStasks")})
          } catch(e) {
            console.warn(`Unable to stop service ${yaml}.`)
            console.warn(e)
          }          
        }
      })
    ])

    console.log(`Deleting ECS Cluster ${awsResources.ECSName}.`)
    try {
      temp = await exec(`ecs-cli down --force --cluster ${awsResources.ECSName} --ecs-profile ${useIAM}`)
      awsResources.ECSName = null
    } catch (e) {
      console.warn(`Unable to delete cluster ${awsResources.ECSName}.`)
      console.warn(e)
    }
  }
  let deletedCluster
  try {
    deletedCluster = deleteCluster()    
  } catch(e) {
    //Nothing
  }


  const deleteDatabases = async () => {
    if (awsResources.dbs == []) {
      console.log(`No databases. Skipping.`)
      return
    }

    console.log(`Removing deletion protection from databases.`) 
    let dbs = awsResources.dbs
    await Promise.all([
      dbs.forEach((db) => {
      try {  
        temp = execSync(`aws rds describe-db-instances --db-instance-identifier ${db} --profile ${useIAM}`)
      } catch (e) {
        console.warn(`Unable to find database ${db}. Possibly it was already deleted.`)
        let tempFunc = (x) => {
          return x.filter((d) => {return (d != db)}) // remove from list
        } 
        awsResources.dbs = tempFunc(awsResources.dbs)
        return
      }
      return exec(`aws rds modify-db-instance --db-instance-identifier ${db} --no-deletion-protection --apply-immediately --profile ${useIAM}`)

      })
    ])

    console.log(`Deleting databases`)

    const checkDatabases = (dbId) => {
      let temp
      try {
        temp = execSync(`aws rds describe-db-instances --db-instance-identifier ${dbId} --profile ${useIAM}`).toString()
      } catch (e) {
        console.error(`Unable to get information for db ${dbId}. Possibly it was already deleted. Skipping`)
        return
      }
      if (temp != "") {
        return (JSON.parse(temp).DBInstances[0].DeletionProtection == false)
      } else {
        return ""
      }
    }

    const wait = async () => {
      //Sometimes, I really miss loops
      if (awsResources.dbs.every((db) => {return checkDatabases(db)})) {
        await Promise.all([awsResources.dbs.map((db) => {
          temp = exec(`aws rds delete-db-instance --db-instance-identifier ${db} --skip-final-snapshot --profile ${useIAM}`)
        })])
        awsResources.dbs = []; //Hopefully they were actually deleted
        return true
      } else {
        console.log('Waiting for DBs to be deletable...')
        setTimeout( wait, 20000 );        
      }
    }

    console.log('Waiting for DBs to be deletable...')
    return await wait();
  }

  let deletedDBs 
  try {
    deletedDBs = deleteDatabases()
  } catch(e) {
    //Nothing
  }

  const deleteStack = async () => {
    try {
      await exec(`aws cloudformation describe-stacks --stack-name ${'amazon-ecs-cli-setup-'.concat(awsResources.name)} --profile ${useIAM}`)
    } catch (e) {
      console.warn(`Unable to find cloudformation stack ${'amazon-ecs-cli-setup-'.concat(awsResources.name)}. May have already been deleted. Skipping.`)
    }
    try {
      return exec(`aws cloudformation delete-stack --stack-name ${'amazon-ecs-cli-setup-'.concat(awsResources.name)} --profile ${useIAM}`)
    } catch (e) {
      console.error(`Unable to delete cloudformation stack ${'amazon-ecs-cli-setup-'.concat(awsResources.name)}.`)
      console.error(e)
      return
    }
  }
  const deletedStack = deleteStack()

  const deleteLoadBalancer = async () => {
    let deletedLoadBalancer
    if (awsResources.loadBalancerName) {
      console.log(`Deleting load balancer`)
      let temp
      try {
        temp = await exec(`aws elbv2 describe-load-balancers --names ${awsResources.loadBalancerName} --profile ${useIAM}`)
      } catch(e) {
        console.warn(`Unable to find load balancer ${awsResources.loadBalancerName}. May have already been deleted. Skipping.`)
        awsResources.loadBalancerName = null
        return
      }
      const loadBalancerARN = JSON.parse(temp.stdout).LoadBalancers[0].LoadBalancerArn
      try {
        deletedLoadBalancer = exec(`aws elbv2 delete-load-balancer --load-balancer-arn ${loadBalancerARN} --profile ${useIAM}`)
        awsResources.loadBalancerName = null
      } catch (e) {
        console.error(`Unable to delete load balancer ${awsResources.loadBalancerName}`)
        console.error(e)
      }    
    } else {
      console.log(`No load balancer. Skipping.`)
    }

    return deletedLoadBalancer    
  }

  let deletedLoadBalancer 
  try {
    deletedLoadBalancer = deleteLoadBalancer();
  } catch(e) {
    //Nothing
  }

  const deleteCloudFront = async () => {
    if (!awsResources.cloudFrontId) {
      console.log(`No cloudfront distribution. Skipping.`)
      return
    }
    let cloudConfig
    let ETag
    try {
      temp = await exec(`aws cloudfront get-distribution-config --id ${awsResources.cloudFrontId} --profile ${useIAM}`)
      cloudConfig = JSON.parse(temp.stdout).DistributionConfig
      ETag = JSON.parse(temp.stdout).ETag
    } catch (e) {
      console.log(`Cannot find cloudfront distribution ${awsResources.cloudFrontId}. May have already been deleted. Skipping.`)      
      awsResources.cloudFrontId = null
      return
    }

    // disableCloudfront.Enabled = false
    // disableCloudfront.CallerReference = cloudConfig.CallerReference
    // disableCloudfront.Origins.Items[0].Id = cloudConfig.Origins.Items[0].Id
    // disableCloudfront.Origins.Items[0].DomainName = cloudConfig.Origins.Items[0].DomainName
    // disableCloudfront.Origins.Items[0].DomainName = cloudConfig.Origins.Items[0].DomainName
    // disableCloudfront.DefaultCacheBehavior.TargetOriginId = cloudConfig.DefaultCacheBehavior.TargetOriginId
    cloudConfig.Enabled = false //This is the only thing to update

    console.log(`Disabling cloudfront distribution`)
    let disableCloudFront
    try {
      disableCloudFront = exec(`aws cloudfront update-distribution \
        --id ${awsResources.cloudFrontId} \
        --if-match ${ETag} \
        --distribution-config '${JSON.stringify(cloudConfig)}' --profile ${useIAM}`)        
    } catch (e) {
      console.error(`Possibly unable to disable cloudfront distribution.\n Sometimes this throws errors but works anyway, so we'll continue and see what happens...\n`)
      disableCloudFront = true
    }

    const tempForETag = await disableCloudFront //This has to finish running first
    ETag = JSON.parse(tempForETag.stdout).ETag
    const checkCloudFront = async () => {
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
            tempCheck = (d.Id == awsResources.cloudFrontId)
          } catch (e) {
            // Probably not a fully created cloudfront distribution.
            // Probably can ignore this. 
            console.warning(`Problem reading cloudFront distribution information.`)
            throw e
          }
          if (tempCheck) {
            distributionReady = ((d.Enabled == false) & (d.Status != "InProgress"))
            distributionExists = true
          }
        })    
      }
      if (!distributionExists) {
        console.error(`Unable to find cloudfront distribution. That is very strange.`)
      }
      return distributionReady
    }

    return new Promise((resolve, reject) => {

      const wait = async () => {
        //Sometimes, I really miss loops
        let temp
        let x = await checkCloudFront()
        if (x) {
          console.log(`Cloudfront is disabled. Deleting.`)
          try {
            await exec(`aws cloudfront delete-distribution --id ${awsResources.cloudFrontId} --if-match ${ETag} --profile ${useIAM}`)
            awsResources.cloudFrontId = null
            resolve(true)
          } catch (e) {
            console.error(`Unable to delete cloudfront distribution`)
            try {
              resolve(exec(`aws cloudfront get-distribution --id ${awsResources.cloudFrontId} --profile ${useIAM}`))
            } catch (e) {
              console.error(e)
              if (JSON.parse(temp.stdout).Distribution.Status != "InProgress") {
                console.error(`Unable to delete cloudfront distribution. It may be worth running pushkin aws armageddon again.`)
                resolve(false)
              }
            }
            console.error(e)
          }
        } else {
          console.log('Waiting for cloudfront distribution to be disabled...')
          setTimeout( wait, 15000 );
        }
      }

      console.log('Waiting for cloudfront distribution to be disabled...')
      wait();
    })

  }

  let deletedCloudFront 
  try {
    deletedCloudFront = deleteCloudFront();
  } catch(e) {
    //Nothing
  }

  await Promise.all([ deletedCloudFront, deletedDBs, deletedLoadBalancer ]);


  const deleteTargetGroup = async () => {
    let deletedTargetGroup
    if (awsResources.targGroupARN){
      console.log(`Deleting target group`)
      try {
        await exec(`aws elbv2 describe-target-groups --target-group-arns ${awsResources.targGroupARN} --profile ${useIAM}`)
      } catch (e) {
        console.warn(`Unable to find target group ${awsResources.targGroupARN}. May have already been deleted. Skipping.`)
        awsResources.targGroupARN = null
        return
      }
      try {
        deletedTargetGroup = exec(`aws elbv2 delete-target-group --target-group-arn ${awsResources.targGroupARN} --profile ${useIAM}`)
        awsResources.targGroupARN = null
      } catch (e) {
        console.error(`Unable to delete associated target group`)
        console.error(e)
      }
    } else {
      console.log(`No target group. Skipping.`)
    }

    return deletedTargetGroup
  }
  let deletedTargetGroup 
  try {
    deletedTargetGroup = deleteTargetGroup()    
  } catch(e) {
    //nothing
  }

  await Promise.all([ deletedCluster, deletedTargetGroup ])

  console.log(`Deleting security groups`)
  let deletedGroups

  const deleteMyGroup = async (g) => {
    let temp
    try {
      await exec(`aws ec2 describe-security-groups --group-names ${g} --profile ${useIAM}`)
    } catch (e) {
      //No security group by that name. Since we didn't keep track, this is not necessarily a surprise, so no warning message.
      return true
    }
    try {
      return exec(`aws ec2 delete-security-group --group-name ${g} --profile ${useIAM}`)
    } catch(e) {
      console.warn(`Unable to delete security group ${g}. PROBABLY this is because AWS needs something else to delete first.\n We recommend you retry 'pushkin aws armageddon' in a few minutes.`)
      console.warn(e)
      return true
    }
  }

  try {
    deletedGroups = Promise.all(["BalancerGroup", "DatabaseGroup", "ECSGroup"].map(deleteMyGroup))
  } catch (e) {
    // Do nothing
  }

  const deleteBucket = async () => {
    if (awsResources.awsName) {
      console.log(`Deleting s3 bucket`)
      try {
        await exec(`aws s3api get-bucket-policy --bucket ${awsResources.awsName} --profile ${useIAM}`)
      } catch (e) {
        console.warn(`Unable to find bucket ${awsResources.awsName}. May have already been deleted. Skipping.`)
//        awsResources.awsName = null;
        return
      }
      try {
        await exec(`aws s3 rb s3://${awsResources.awsName} --force --profile ${useIAM}`)
//        awsResources.awsName = null;
        return
      } catch (e) {
        console.error(`Unable to delete s3 bucket ${awsResources.awsName}`)
      }       
    } else {
      console.log(`No s3 bucket. Skipping.`)
      return
    }
  }

  let deletedBucket 
  try {
    deletedBucket = deleteBucket();
  } catch(e) {
    //nothing
  }

  await Promise.all([ deletedBucket ])

  console.log(`Updating awsResources.js`)
  try {
    await fs.promises.writeFile(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
  } catch (e) {
    console.error(`Unable to update awsResources.js`)
    console.error(e)
  }    

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
    let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
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
    let config = jsYaml.safeLoad(temp)
    alarmMainHigh.Dimensions.Value = config.productionDBs.Main.name
    alarmTransactionHigh.Dimensions.Value = config.productionDBs.Transaction.name
    useEmail = config.info.email
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e;
  } 

  try {
    let temp = await exec(`aws elbv2 describe-load-balancers --names ${loadBalancerName} --profile ${useIAM}`)
    balancerARN = JSON.parse(temp.stdout).LoadBalancers[0].LoadBalancerArn
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
    let awsResources = jsYaml.safeLoad(fs.readFileSync(path.join(process.cwd(), 'awsResources.js'), 'utf8'));
    awsResources.alarmUp = alarmUp
    awsResources.alarmDown = alarmDown
    awsResources.policyARN = policyARN
    fs.writeFileSync(path.join(process.cwd(), 'awsResources.js'), jsYaml.safeDump(awsResources), 'utf8');
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

