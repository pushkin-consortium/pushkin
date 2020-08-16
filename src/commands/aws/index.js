import { v4 as uuid } from 'uuid';
import fs from 'fs';
import path from 'path';
import util from 'util';
import pacMan from '../../pMan.js'; //which package manager is available?
import { execSync } from 'child_process'; // eslint-disable-line
import jsYaml from 'js-yaml';
import { policy, cloudfront, dbConfig, rabbitTask, apiTask, workerTask, recordSet } from './awsConfigs.js'
import { setupTransactionsDB } from '../setupdb/index.js';
import inquirer from 'inquirer'
const exec = util.promisify(require('child_process').exec);
const mkdir = util.promisify(require('fs').mkdir);

const publishToDocker = function (DHID) {
  console.log("Building API")
  try {
    execSync(`docker build -t ${DHID}/api:latest pushkin/api`, {cwd: process.cwd()})
  } catch(e) {
    console.error(`Problem building API`)
    throw e
  }
  console.log("Pushkin API to DockerHub")
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

const deployFrontEnd = async (projName, awsName, useIAM, myDomain, myCertificate) => {
  let temp

  console.log("Creating s3 bucket")
  try {
    await exec(`aws s3 mb s3://`.concat(awsName).concat(` --profile `).concat(useIAM))
  } catch(e) {
    console.error('Problem creating bucket for front-end')
    throw e
  }

  console.log("Copying files to bucket")
  let syncMe
  try {
    syncMe = exec(`aws s3 sync build/ s3://${awsName} --profile ${useIAM}`, {cwd: path.join(process.cwd(), 'pushkin/front-end')})
  } catch(e) {
    console.error(`Unable to sync local build with s3 bucket`)
    throw e
  }

  console.log("Setting permissions")
  policy.Statement[0].Resource = "arn:aws:s3:::".concat(awsName).concat("/*")
  try {
    await exec(`aws s3 website s3://${awsName} --profile ${useIAM} --index-document index.html --error-document index.html`)
    await (`aws s3api put-bucket-policy --bucket `.concat(awsName).concat(` --policy '`).concat(JSON.stringify(policy)).concat(`' --profile ${useIAM}`))
  } catch (e) {
    console.error('Problem setting bucket permissions for front-end')
    throw e
  }

  console.log("Deploy to CloudFront")
  cloudfront.CallerReference = awsName;
  cloudfront.DefaultCacheBehavior.TargetOriginId = awsName;
  cloudfront.Origins.Items[0].Id = awsName;
  cloudfront.Origins.Items[0].DomainName = awsName.concat('.s3.amazonaws.com');
  if (myDomain != "default") {
    // set up DNS
    cloudFront.Aliases.Quantity = 2
    cloudFront.Aliases.Items = [myDomain, 'www.'.concat(myDomain)]
    cloudFront.ViewerCertificate.CloudFrontDefaultCertificate = false
    cloudFront.ViewerCertificate.ACMCertificateArn = myCertificate
    cloudFront.ViewerCertificate.SSLSupportMethod = 'sni-only'
    cloudFront.ViewerCertificate.MinimumProtocolVersion = 'TLSv1.2_2019'
  }
  let myCloud
  try {
    myCloud = exec(`aws cloudfront create-distribution --distribution-config '`.concat(JSON.stringify(cloudfront)).concat(`' --profile ${useIAM}`))
  } catch (e) {
    console.log('Could not set up cloudfront.')
    throw e
  }

  console.log(`Retrieving hostedzone ID for ${myDomain}`)
  let zoneID
  try {
    temp = await exec(`aws route53 list-hosted-zones-by-name --dns-name ${myDomain} --profile ${useIAM}`)
    zoneID = temp.HostedZones[0].Id.split("/hostedzone/")[1]
  } catch (e) {
    console.error(`Unable to retrieve hostedzone for ${myDomain}`)
    throw e
  }

  recordSet.HostedZoneId = zoneID
  recordSet.ChangeBatch.Changes.ResourceRecordSet.Name = "CloudFront1"
  recordSet.ChangeBatch.Changes.ResourceRecordSet.AliasTarget = myCloud.Distribution.DomainName
  recordSet.ChangeBatch.Changes.ResourceRecordSet.SetIdentifier = "A"

  try {
    await exec(`aws route53 change-resource-record-sets --cli-input-json ${recordSet} --profile ${trialPushkin}`)
  } catch (e) {
    console.error(`Unable to create resource record set for ${myDomain}`)
  }
  
  // Two record sets required if IPv6 is enabled
  recordSet.ChangeBatch.Changes.ResourceRecordSet.SetIdentifier = "AAAA"
  try {
    await exec(`aws route53 change-resource-record-sets --cli-input-json ${recordSet} --profile ${trialPushkin}`)
  } catch (e) {
    console.error(`Unable to create resource record set for ${myDomain}`)
  }

  await syncMe

  return
}

const initDB = async (dbType, securityGroupID, projName, awsName, useIAM) => {
  console.log(`Creating ${dbType} database.`)
  let stdOut

  const dbPassword = Math.random().toString() //Pick random password for database
  let dbName = projName.concat(dbType).replace(/[^\w\s]/g, "").replace(/ /g,"")

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
    return;
  }

  let myDBConfig = dbConfig;
  myDBConfig.DBName = dbName
  myDBConfig.DBInstanceIdentifier = dbName
  myDBConfig.VpcSecurityGroupIds = [securityGroupID]
  myDBConfig.MasterUserPassword = dbPassword //This had better get updated!
  try {
    stdOut = await exec(`aws rds create-db-instance --cli-input-json '`.concat(JSON.stringify(myDBConfig)).concat(`' --profile `).concat(useIAM))
  } catch(e) {
    console.error(`Unable to create database ${dbType}`)
    throw e
  }

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

  let transactionsEndpoint
  try {
     stdOut = await exec(`aws rds describe-db-instances --db-instance-identifier ${dbName} --profile ${useIAM}`)
     transactionsEndpoint = JSON.parse(stdOut.stdout);
  } catch (e) {
    console.error(`Problem getting ${dbType} endpoint.`)
    throw e
  }
  
  const newDB = {
    "type": dbType,
    "name": dbName, 
    "endpoint": transactionsEndpoint.DBInstances[0].Endpoint.Address, 
    "username": myDBConfig.MasterUsername, 
    "password": myDBConfig.MasterUserPassword,
    "port": myDBConfig.Port
  }
console.log(`newDB: ${JSON.stringify(newDB)}`) //FUBAR for debugging
  
  return newDB
}

// const getDBInfo = async (n = 0) => {
//   if (n > 30) {
//     throw new Error(`Database creation timed out.`)
//   }
//   let temp
//   let pushkinConfig
//   try {
//     temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
//     pushkinConfig = jsYaml.safeLoad(temp)
//     console.log(pushkinConfig)
//   } catch (e) {
//     console.error(`Couldn't load pushkin.yaml`)
//     throw e
//   }
//   if (pushkinConfig.productionDBs.length >= 2 ) {
//     let dbsByType
//     //fubar - just changed this to assume JSON. Might not be right.
//     Object.keys(pushkinConfig.productionDBs).forEach((d) => {
//       dbTypesByName[pushkinConfig.productionDBs[d].type] = {
//         "name": pushkinConfig.productionDBs[d].name,
//         "username": pushkinConfig.productionDBs[d].username,
//         "password": pushkinConfig.productionDBs[d].password,
//         "port": pushkinConfig.productionDBs[d].port,
//         "endpoint": pushkinConfig.productionDBs[d].endpoint
//       }
//   } else {
//     console.log(`Waiting for DB creation to complete...${n}`);
//   }

//   await new Promise(r => setTimeout(r, 30000));
//   const stillWaiting = await getDBInfo(n+1);
// }

//     })
//     return dbsByType  
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
  console.log(JSON.stringify(pushkinConfig)) //FUBAR debugging
  if (Object.keys(pushkinConfig.productionDBs).length >= 2 ) {
    let dbsByType = {}
    //fubar - just changed this to assume JSON. Might not be right.
    Object.keys(pushkinConfig.productionDBs).forEach((d) => {
      dbsByType[pushkinConfig.productionDBs[d].type] = {
        "name": pushkinConfig.productionDBs[d].name,
        "username": pushkinConfig.productionDBs[d].username,
        "password": pushkinConfig.productionDBs[d].password,
        "port": pushkinConfig.productionDBs[d].port,
        "endpoint": pushkinConfig.productionDBs[d].endpoint
      }
    })
    return dbsByType  
  } else {
    throw new Error(`Error finding production DBs in pushkin.yaml`);
  }

  return dbsByType
}


const ecsTaskCreator = async (projName, awsName, useIAM, DHID, completedDBs) => {
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

  const ecsCompose = async (yaml, task, name) => {

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
      compose = exec(`ecs-cli compose -f ${yaml} -p ${name} create`, { cwd: path.join(process.cwd(), "ECStasks")})
    } catch (e) {
      console.error(`Failed to run ecs-cli compose on ${yaml}`)
      throw e
    }
    return compose
  }

  const rabbitPW = Math.random().toString();
  const rabbitCookie = uuid();
  const rabbitAddress = "amqp://".concat(awsName).concat(":").concat(rabbitPW).concat("@localhost:5672")
  rabbitTask.services['message-queue'].environment.RABBITMQ_DEFAULT_USER = projName.replace(/[^\w\s]/g, "").replace(/ /g,"");
  rabbitTask.services['message-queue'].environment.RABBITMQ_DEFAULT_PASSWORD = rabbitPW;
  rabbitTask.services['message-queue'].environment.RABBITMQ_ERLANG_COOKIE = rabbitCookie;
  apiTask.services['api'].environment.AMPQ_ADDRESS = rabbitAddress;
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
  console.log("completedDBs:\n", JSON.stringify(completedDBs)) //FUBAR debugging
  const dbInfoByTask = await getDBInfo();
  console.log('got DB info') //FUBAR for debugging

  let composedRabbit
  let composedAPI
  let composedWorkers
  try {
    composedRabbit = ecsCompose('rabbitTask.yml', rabbitTask, 'message-queue')
    composedRabbit = ecsCompose('apiTask.yml', apiTask, 'api')
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
        "AMPQ_ADDRESS" : rabbitAddress,
        "DB_USER": dbInfoByTask['Main'].username,
        "DB_NAME": dbInfoByTask['Main'].name,
        "DB_PASS": dbInfoByTask['Main'].password,
        "DB_URL": dbInfoByTask['Main'].endpoint,
        "DB_SMARTURL": `postgres://${dbInfoByTask['Main'].username}:${dbInfoByTask['Main'].password}@${dbInfoByTask['Main'].endpoint}:/${dbInfoByTask['Main'].port}/${dbInfoByTask['Main'].name}`,
        "TRANSACTION_DATABASE_URL": `postgres://${dbInfoByTask['Transaction'].username}:${dbInfoByTask['Transaction'].password}@${dbInfoByTask['Transaction'].endpoint}:/${dbInfoByTask['Transaction'].port}/${dbInfoByTask['Transaction'].name}`
      }
      task.services[w].command = workerTask.services["EXPERIMENT_NAME"].command
      task.services[w].command = workerTask.services["EXPERIMENT_NAME"].command
      console.log(`task:\n ${JSON.stringify(task)}`) //FUBAR for debuggins
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
    return JSON.parse(stdOut.toString()).GroupId //remember security group in order to use later!
  }

  let securityGroups
  try {
    securityGroups = await exec(`aws ec2 describe-security-groups --profile trialPushkin`)
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
    let SGRule1 = `aws ec2 authorize-security-group-ingress --group-name ECSGroup --ip-permissions IpProtocol=tcp,FromPort=80,ToPort=80,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let SGRule2 = `aws ec2 authorize-security-group-ingress --group-name ECSGroup --ip-permissions IpProtocol=tcp,FromPort=22,ToPort=22,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let SGRule3 = `aws ec2 authorize-security-group-ingress --group-name ECSGroup --ip-permissions IpProtocol=tcp,FromPort=1024,ToPort=65535,Ipv6Ranges='[{CidrIpv6=::/0}]',IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let SGRule4 = `aws ec2 authorize-security-group-egress --group-name ECSGroup --ip-permissions IpProtocol=-1,IpRanges='[{CidrIp=0.0.0.0/0}]' --profile ${useIAM}`
    let stdOut
    try {
      stdOut = await exec(SGCreate)
      await Promise.all([exec(SGRule1), exec(SGRule2), exec(SGRule3), exec(SGRule4)])
    } catch(e) {
      console.error(`Failed to create security group for load balancer`)
      throw e
    }
    return JSON.parse(stdOut.toString()).GroupId //remember security group in order to use later!
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
  console.log(aws_access_key_id)
  console.log(aws_secret_access_key)

  const ECSName = projName.replace(/[^\w\s]/g, "").replace(/ /g,"");
  const setProfile = `ecs-cli configure profile --profile-name ${useIAM} --access-key ${aws_access_key_id} --secret-key ${aws_secret_access_key}`.replace(/(\r\n|\n|\r)/gm," ")
  console.log(setProfile)
  try {
    //not necessary if already set up, but doesn't seem to hurt anything
    temp = await exec(setProfile)
  } catch (e) {
    console.error(`Unable to set up profile ${useIAM} for ECS CLI.`)
    throw e
  }
  console.log(`ECS CLI configured`)

  let createdECSTasks
  try {
    console.log('Creating ECS tasks')
    createdECSTasks = ecsTaskCreator(projName, awsName, useIAM, DHID, completedDBs);
  } catch(e) {
    throw e
  }

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
    //Probably we should check if there is already a configuration with this name and ask before replacing.
    //launchedECS = exec(`ecs-cli configure --cluster ${ECSName} --default-launch-type EC2 --region us-east-1 --config-name ${ECSName}`)
    launchedECS = exec(`ecs-cli up --keypair my-pushkin-key-pair --capability-iam --size 1 --instance-type t2.small --cluster ${ECSName} --security-group ${ecsSecurityGroupID} --vpc ${myVPC} --subnets ${subnets.join(' ')} --ecs-profile ${useIAM} --force`)
  } catch (e) {
    console.error(`Unable to launch cluster ${ECSName}.`)
    throw e
  }

  console.log(`Creating application load balancer`)
  if (!foundBalancerGroup) {BalancerSecurityGroupID = await madeBalancerGroup}
  console.log(`FUBAR. BalancerSecurityGroupID: ${BalancerSecurityGroupID}`) //FUBAR for debugging
  const loadBalancerName = ECSName.concat("Balancer")
  let madeBalancer
  try {
    madeBalancer = exec(`aws elbv2 create-load-balancer --name ${loadBalancerName} --type application --scheme internet-facing --subnets ${subnets.join(' ')} --security-groups ${BalancerSecurityGroupID} --profile ${useIAM}`)
  } catch (e) {
    console.error(`Unable to create application load balancer`)
    throw e
  }

  try {
    temp = await exec(`aws elbv2 create-target-group --name ${loadBalancerName}Targets --protocol HTTP --port 80 --vpc-id ${myVPC} --profile ${useIAM}`)
  } catch(e) {
    console.error(`Unable to create target group`)
    throw e
  }
  const targGroupARN = JSON.parse(temp.stdout).TargetGroups[0].TargetGroupArn

  temp = await madeBalancer //need this for the next step
  const balancerARN = JSON.parse(temp.stdout).LoadBalancers[0].LoadBalancerArn
  temp = await  exec(`aws elbv2 create-listener --load-balancer-arn ${balancerARN} --protocol HTTP --port 80  --default-actions Type=forward,TargetGroupArn=${targGroupARN} --profile ${useIAM}`)

  let addedHTTPS
  try {
    addedHTTPS = exec(`aws elbv2 create-listener --load-balancer-arn ${balancerARN} --protocol HTTPS --port 443 --certificates CertificateArn=${myCertificate} --default-actions Type=forward,TargetGroupArn=${targGroupARN} --profile ${useIAM}`)
    console.log(`Added HTTPS to load balancer`)
  } catch (e) {
    console.error(`Unable to add HTTPS to load balancer`)
    throw e
  }

  await Promise.all([ launchedECS, addedHTTPS, createdECSTasks ])
  console.log(`ECS cluster launched`)
  console.log(`Added HTTPS to load balancer`)
  console.log(`Created ECS task definitions`)

  return
}

export async function awsInit(projName, awsName, useIAM, DHID) {
  let temp

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

  let pushkinConfig
  try {
    stdOut = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'), 'utf8')
    pushkinConfig = jsYaml.safeLoad(stdOut)
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`)
    throw e
  }

  pushkinConfig.info.rootDomain = myDomain
  try {
    stdOut = await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig), 'utf8')
    console.log(`Successfully updated pushkin.yaml with custom domain.`)
  } catch(e) {
    throw e
  }

  //FUBAR
  process.exit();
  try {
    await deployFrontEnd(projName, awsName, useIAM, myDomain, myCertificate)
  } catch(e) {
    console.error(`Failed to deploy front end`)
    throw e
  }
  process.exit()
  //FUBAR


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
    temp = await exec(`aws ec2 describe-security-groups --profile trialPushkin`)
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

  const recordDBs = async(dbsDone) => {
    const returnedPromises = await dbsDone //initializedTransactionsDB must be first in this list
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
    pushkinConfig.productionDBs[transactionDB.type] = transactionDB;
    pushkinConfig.productionDBs[mainDB.type] = mainDB;
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
  console.log('Publishing images to DockerHub')
  let publishedToDocker
  try {
    publishedToDocker = publishToDocker(DHID);
  } catch(e) {
    console.error('Unable to publish images to DockerHub')
    throw e
  }

  await publishedToDocker

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


  let configuredECS
  try {
    configuredECS = setupECS(projName, awsName, useIAM, DHID, completedDBs, myCertificate);
  } catch(e) {
    throw e
  }

  pushkinConfig = await completedDBs;

  let setupTransactionsTable
  try {
    setupTransactionsTable = setupTransactionsDB(pushkinConfig.productionDBs.Transaction, useIAM);
  } catch (e) {
    throw e
  }

  await Promise.all([deployedFrontEnd, configuredECS, setupTransactionsTable])
  console.log(`FUBAR. Still not done. But done.`)
  return
}

export async function nameProject(projName) {
  let awsConfig = {}
  let stdOut;
  awsConfig.name = projName;
  awsConfig.awsName = projName.replace(/[^\w\s]/g, "").replace(/ /g,"-").concat(uuid()).toLowerCase();
  try {
    stdOut = fs.writeFileSync(path.join(process.cwd(), 'awsConfig.js'), JSON.stringify(awsConfig), 'utf8');
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

