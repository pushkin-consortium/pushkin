/**
 * AWS ECS Service Management
 * Handles ECS cluster, task, and service creation and deletion for Pushkin deployments
 * @module ecs
 */

import { ECSClient, CreateClusterCommand } from "@aws-sdk/client-ecs";
import {
  EC2Client,
  DescribeKeyPairsCommand,
  CreateKeyPairCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
} from "@aws-sdk/client-ec2";
import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../../utils/aws-resources.js";
import { AWS_REGION } from "../../constants.js";
import { ensureBalancerSecurityGroup, ensureECSSecurityGroup } from "../security.js";
import { createECSTask } from "./tasks.js";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { mkdir } from "fs/promises";
import { exec as execCallback } from "child_process";
import { promisify } from "util";
import { quote } from "shell-quote";
import { loadAwsConfig } from "../../utils/aws-config.js";
import { writeFile } from "../../../../utils/file.js";

export { deleteStack, deleteCluster } from "./clusters.js";

const exec = promisify(execCallback);

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * Set up ECS cluster and related resources:
 * - Security groups and SSH keys
 * - Load balancers and target groups
 * - Auto-scaling configuration
 * - Network setup (VPC, subnets)
 * @param {string} projName - The name of the project
 * @param {boolean} useIAM - Whether to use IAM roles
 * @param {string} DHID - The Docker Hub ID
 * @param {Promise} completedDBs - A promise that resolves when the databases are set up
 * @param {string} myCertificate - The certificate for the project
 * @returns {Promise} - A promise that resolves when the ECS setup is complete
 */
const setupECS = async (projName, useIAM, DHID, completedDBs, myCertificate) => {
  console.log(`Starting ECS setup`);

  /**
   * Create an SSH key pair
   * @param {boolean} useIAM - Whether to use IAM roles
   */
  const makeSSH = async (useIAM) => {
    let keyPairs;
    let foundPushkinKeyPair = false;
    try {
      const profileName = useIAM;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ec2Client = factory.createClient(EC2Client);
      const describeKeyPairsResponse = await ec2Client.send(new DescribeKeyPairsCommand({}));
      keyPairs = { stdout: JSON.stringify({ KeyPairs: describeKeyPairsResponse.KeyPairs }) };
    } catch (error) {
      console.error(`Failed to get list of key pairs`, error);
    }
    JSON.parse(keyPairs.stdout).KeyPairs.forEach((k) => {
      if (k.KeyName == "my-pushkin-key-pair") {
        foundPushkinKeyPair = true;
      }
    });

    if (foundPushkinKeyPair) {
      console.log(`Pushkin key pair already exists. Skipping creation.`);
      return;
    } else {
      try {
        console.error(`Making SSH key`);
        const profileName = useIAM;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const ec2Client = factory.createClient(EC2Client);
        const createKeyPairResponse = await ec2Client.send(
          new CreateKeyPairCommand({
            KeyName: "my-pushkin-key-pair",
          }),
        );
        // Write the key material to file
        const keyPath = path.join(process.cwd(), "pushkinKey");
        writeFile(keyPath, createKeyPairResponse.KeyMaterial);
        // Set file permissions to be read-only by owner
        const chmodCmd = quote(["chmod", "400", keyPath]);
        await exec(chmodCmd);
      } catch (error) {
        console.error(`Problem creating AWS SSH key`, error);
      }
      return;
    }
  };

  let madeSSH = makeSSH(useIAM);

  // Ensure load balancer security group exists (delegated to security.js)
  const BalancerSecurityGroupID = await ensureBalancerSecurityGroup(useIAM, projName);

  // Ensure ECS security group exists (delegated to security.js)
  const ecsSecurityGroupID = await ensureECSSecurityGroup(useIAM, projName);

  //need one subnet per availability zone in region. Region is based on region for the profile.
  //Start this process early to use later.
  const foundSubnets = new Promise(async (resolve, reject) => {
    console.log(`Retrieving subnets for AWS zone`);
    try {
      const profileName = useIAM;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ec2Client = factory.createClient(EC2Client);
      const describeSubnetsResponse = await ec2Client.send(new DescribeSubnetsCommand({}));
      let subnets = {};
      describeSubnetsResponse.Subnets.forEach((subnet) => {
        subnets[subnet.AvailabilityZone] = subnet.SubnetId;
      });
      resolve(subnets);
    } catch (e) {
      console.error(`Failed to retrieve available subnets.`);
      reject(e);
    }
  });

  //CLI uses the default VPC by default. Retrieve the ID.
  const getVPC = async (useIAM) => {
    console.log("getting default VPC");
    let describeVpcsResponse;
    try {
      const profileName = useIAM;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ec2Client = factory.createClient(EC2Client);
      describeVpcsResponse = await ec2Client.send(new DescribeVpcsCommand({}));
    } catch (e) {
      console.error(`Unable to find VPC`);
      throw e;
    }
    let useVPC;
    describeVpcsResponse.Vpcs.forEach((v) => {
      if (v.IsDefault == true) {
        useVPC = v.VpcId;
      }
    });
    console.log("Default VPC: ", useVPC);
    return useVPC;
  };
  let gotVPC;
  gotVPC = getVPC(useIAM);

  try {
    if (fs.existsSync(path.join(process.cwd(), "ECStasks"))) {
      //nothing
    } else {
      console.log("Making ECSTasks folder");
      await mkdir(path.join(process.cwd(), "ECStasks"));
    }
  } catch (e) {
    console.error(`Problem with ECSTasks folder`);
    throw e;
  }
  try {
    console.log(`Making ecs-params.yml`);
    // This lets us set the network mode for all services.
    // Currently that cannot be done through the task docker file
    let ecsParams = {
      version: 1,
      task_definition: {
        ecs_network_mode: "host",
      },
    };
    await fs.promises.writeFile(
      path.join(process.cwd(), "ECStasks/ecs-params.yml"),
      jsYaml.dump(ecsParams),
      "utf8",
    );
  } catch (e) {
    console.error(`Unable to create ecs-params.yml`);
    throw e;
  }

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");
  // Note: Previously used ECS-CLI with AWS CLI credentials, now using AWS SDK directly

  let launchedECS;
  await madeSSH; //need this shortly
  console.log(`SSH set up`);
  const zones = await foundSubnets;
  console.log(`Subnets identified`);
  let subnets;
  try {
    subnets = Object.keys(zones).map((z) => zones[z]);
  } catch (e) {
    console.error(`Problem extracting list of subnets in your zone from 'zones': `, zones);
    throw e;
  }

  const myVPC = await gotVPC;
  try {
    console.log("Launching ECS cluster");
    //Note that cluster is named here, although that should match the default anyway.
    // ecs-cli uses the deprecated Launch Configuration, which AWS is phasing out in favor of
    // Launch Templates and Fargate over ECS EC2. However, as of this writing (2025-09) ecs-cli does not support Launch Templates.
    // Switching to using AWS CLI in this branch, but opening up a new branch to try out migrating to AWS Copilot CLI
    // Create ECS cluster using AWS SDK instead of deprecated ecs-cli
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ecsClient = factory.createClient(ECSClient);
    try {
      await ecsClient.send(
        new CreateClusterCommand({
          clusterName: ECSName,
          tags: [{ key: PROJECT_TAG_KEY, value: projName }],
        }),
      );
      console.log(`Created ECS cluster: ${ECSName}`);
      launchedECS = Promise.resolve(); // Maintain compatibility with existing code
    } catch (error) {
      if (error.name === "ClusterAlreadyExistsException") {
        console.log(`ECS cluster ${ECSName} already exists, continuing...`);
        launchedECS = Promise.resolve();
      } else {
        throw error;
      }
    }
  } catch (e) {
    console.error(`Unable to launch cluster ${ECSName}.`);
    throw e;
  }

  console.log(`Creating application load balancer`);
  const loadBalancerName = ECSName.concat("Balancer");

  try {
    console.log(`Updating awsResources.js with load balancer info`);
    updateAwsResourcesField("loadBalancerName", loadBalancerName);
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  let madeBalancer;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    madeBalancer = elbv2Client.send(
      new CreateLoadBalancerCommand({
        Name: loadBalancerName,
        Type: "application",
        Scheme: "internet-facing",
        Subnets: subnets,
        SecurityGroups: [BalancerSecurityGroupID],
        Tags: [{ Key: PROJECT_TAG_KEY, Value: projName }],
      }),
    );
  } catch (e) {
    console.error(`Unable to create application load balancer`);
    throw e;
  }

  let tempMakeTargetGroup;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    tempMakeTargetGroup = await elbv2Client.send(
      new CreateTargetGroupCommand({
        Name: loadBalancerName.concat("Targets").slice(0, 32),
        Protocol: "HTTP",
        Port: 80,
        VpcId: myVPC,
        TargetType: "ip", // Required for Fargate with awsvpc network mode
      }),
    );
  } catch (e) {
    console.error(`Unable to create target group`);
    throw e;
  }
  const targGroupARN = tempMakeTargetGroup.TargetGroups[0].TargetGroupArn;
  try {
    console.log(`Updating awsResources.js with target group info`);
    updateAwsResourcesField("targGroupARN", targGroupARN);
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  let aMadeBalancer = await madeBalancer; //need this for the next step
  const balancerARN = aMadeBalancer.LoadBalancers[0].LoadBalancerArn;
  const balancerEndpoint = aMadeBalancer.LoadBalancers[0].DNSName;
  const balancerZone = aMadeBalancer.LoadBalancers[0].CanonicalHostedZoneId;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    await elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTP",
        Port: 80,
        DefaultActions: [
          {
            Type: "forward",
            TargetGroupArn: targGroupARN,
          },
        ],
      }),
    );
  } catch (e) {
    console.error(`Unable to create listener`);
    throw e;
  }

  let addedHTTPS;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    addedHTTPS = elbv2Client.send(
      new CreateListenerCommand({
        LoadBalancerArn: balancerARN,
        Protocol: "HTTPS",
        Port: 443,
        Certificates: [{ CertificateArn: myCertificate }],
        DefaultActions: [
          {
            Type: "forward",
            TargetGroupArn: targGroupARN,
          },
        ],
      }),
    );
    console.log(`Added HTTPS to load balancer`);
  } catch (e) {
    console.error(`Unable to add HTTPS to load balancer`);
    throw e;
  }

  await Promise.all([launchedECS, addedHTTPS]);
  console.log(`ECS cluster launched`);

  let createdECSTasks;
  console.log("Creating ECS tasks");
  createdECSTasks = createECSTask(
    projName,
    useIAM,
    DHID,
    completedDBs,
    ECSName,
    targGroupARN,
    subnets,
    ecsSecurityGroupID,
  );
  await createdECSTasks;
  console.log(`Created ECS task definitions`);

  return [balancerEndpoint, balancerZone];
};

export { setupECS };
