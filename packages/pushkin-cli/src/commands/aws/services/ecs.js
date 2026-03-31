import {
  IAMClient,
  GetRoleCommand,
  CreateRoleCommand,
  AttachRolePolicyCommand,
} from "@aws-sdk/client-iam";
import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  DescribeServicesCommand,
  UpdateServiceCommand,
  CreateServiceCommand,
  DescribeClustersCommand,
  CreateClusterCommand,
  ListClustersCommand,
  ListTasksCommand,
  StopTaskCommand,
  ListServicesCommand,
  DeleteServiceCommand,
  DeleteClusterCommand,
} from "@aws-sdk/client-ecs";
import {
  EC2Client,
  DescribeKeyPairsCommand,
  CreateKeyPairCommand,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
} from "@aws-sdk/client-ec2";
import {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
  CloudFormationClient,
  ListStacksCommand,
  DeleteStackCommand,
} from "@aws-sdk/client-cloudformation";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../utils/aws-resources.js";
import { AWS_REGION } from "../constants.js";
import { rabbitTask, apiTask, workerTask } from "../awsConfigs.js";
import { getDBInfo } from "./rds.js";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { mkdir } from "fs/promises";
import { exec, execSync } from "child_process";
import { loadAwsConfig } from "../utils/aws-config.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * Ensure ECS Task Execution Role exists, creating it if necessary
 * @param {object} useIAM - IAM profile configuration
 * @returns {Promise<string>} The ARN of the execution role
 */
const ensureECSTaskExecutionRole = async (useIAM) => {
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const iamClient = factory.createClient(IAMClient);
  const roleName = "ecsTaskExecutionRole";

  try {
    // Try to get the existing role
    const getRoleCommand = new GetRoleCommand({ RoleName: roleName });
    const roleResponse = await iamClient.send(getRoleCommand);
    console.log(`ECS Task Execution Role already exists: ${roleResponse.Role.Arn}`);
    return roleResponse.Role.Arn;
  } catch (error) {
    if (error.name === "NoSuchEntity" || error.name === "NoSuchEntityException") {
      // Role doesn't exist, create it
      console.log(`Creating ECS Task Execution Role: ${roleName}`);

      const assumeRolePolicyDocument = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "ecs-tasks.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      };

      const createRoleCommand = new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
        Description: "Allows ECS tasks to call AWS services on your behalf",
      });

      const createRoleResponse = await iamClient.send(createRoleCommand);
      const roleArn = createRoleResponse.Role.Arn;

      // Attach the managed policy for ECS task execution
      const attachPolicyCommand = new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
      });

      await iamClient.send(attachPolicyCommand);
      console.log(`Created and configured ECS Task Execution Role: ${roleArn}`);

      return roleArn;
    } else {
      console.error(`Error checking for ECS Task Execution Role:`, error);
      throw error;
    }
  }
};

/**
 * Create ECS tasks for the API and worker containers
 * @param {string} projName - The name of the project
 * @param {boolean} useIAM - Whether to use IAM roles
 * @param {string} DHID - The DataHub ID
 * @param {Array} completedDBs - The list of completed databases
 * @param {string} ECSName - The name of the ECS cluster
 * @param {string} targGroupARN - The target group ARN
 * @param {Array<string>} subnets - Array of subnet IDs for Fargate tasks
 * @param {string} ecsSecurityGroupID - Security group ID for Fargate tasks
 * @returns {Promise} - A promise that resolves when the ECS tasks are created
 */
const ecsTaskCreator = async (
  projName,
  useIAM,
  DHID,
  completedDBs,
  ECSName,
  targGroupARN,
  subnets,
  ecsSecurityGroupID,
) => {
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

  // Ensure ECS Task Execution Role exists and get its ARN
  const executionRoleArn = await ensureECSTaskExecutionRole(useIAM);

  /**
   * Convert Docker Compose YAML to ECS Task Definition format
   * @param {object} composeService - Single service from docker-compose YAML
   * @param {string} family - Task definition family name
   * @param {string} serviceName - Name of the service
   * @param {string} executionRoleArn - ARN of the ECS task execution role
   * @returns {object} ECS Task Definition parameters
   */
  const convertComposeToTaskDef = (composeService, family, serviceName, executionRoleArn) => {
    // Parse memory limit (e.g., "512m" → 512)
    const parseMemory = (mem) => {
      if (!mem) return 512;
      if (typeof mem === "number") return mem;
      return parseInt(mem.toString().replace(/[^0-9]/g, ""));
    };

    // Fargate has specific CPU/Memory combinations
    // Memory options: 512, 1024, 2048, 3072, 4096, etc.
    const containerMemory = parseMemory(composeService.mem_limit);
    const taskMemory = Math.max(512, containerMemory); // Fargate minimum is 512

    // CPU must match memory (0.25 vCPU = 256 units)
    // For 512 MB: 0.25 vCPU (256)
    // For 1024 MB: 0.5 vCPU (512) or 1 vCPU (1024)
    // For 2048 MB: 1 vCPU (1024) or 2 vCPU (2048)
    const taskCPU =
      taskMemory <= 512 ? "256"
      : taskMemory <= 1024 ? "512"
      : "1024";

    // Parse port mappings - Fargate doesn't use hostPort in awsvpc mode
    const portMappings = [];
    if (composeService.ports) {
      composeService.ports.forEach((portDef) => {
        const [hostPort, containerPort] = portDef.split(":").map((p) => parseInt(p));
        portMappings.push({
          containerPort: containerPort || hostPort,
          protocol: "tcp",
          // Note: hostPort is not used in awsvpc network mode (Fargate requirement)
        });
      });
    }

    // Convert environment variables
    const environment = [];
    if (composeService.environment) {
      Object.entries(composeService.environment).forEach(([name, value]) => {
        environment.push({ name, value: String(value) });
      });
    }

    // Build container definition
    const containerDefinition = {
      name: serviceName,
      image: composeService.image,
      memory: containerMemory,
      essential: true,
      portMappings,
      environment,
    };

    // Add logging if specified
    if (composeService.logging) {
      containerDefinition.logConfiguration = {
        logDriver: composeService.logging.driver,
        options: composeService.logging.options,
      };
    }

    return {
      family,
      containerDefinitions: [containerDefinition],
      requiresCompatibilities: ["FARGATE"], // Using Fargate instead of EC2
      networkMode: "awsvpc", // Required for Fargate
      cpu: taskCPU, // Task-level CPU (required for Fargate)
      memory: taskMemory.toString(), // Task-level memory (required for Fargate)
      executionRoleArn, // Required for Fargate to pull images and write logs
    };
  };

  /**
   * Register an ECS task definition
   * @param {object} taskDefParams - Task definition parameters
   * @param {string} useIAM - IAM profile to use
   * @returns {Promise<string>} Task definition ARN
   */
  const registerECSTaskDefinition = async (taskDefParams, useIAM) => {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ecsClient = factory.createClient(ECSClient);

    try {
      const command = new RegisterTaskDefinitionCommand(taskDefParams);
      const response = await ecsClient.send(command);
      console.log(
        `Registered task definition: ${response.taskDefinition.family}:${response.taskDefinition.revision}`,
      );
      return response.taskDefinition.taskDefinitionArn;
    } catch (error) {
      console.error(`Failed to register task definition ${taskDefParams.family}:`, error.message);
      throw error;
    }
  };

  /**
   * Create an ECS service
   * @param {string} serviceName - Name of the service
   * @param {string} taskDefArn - Task definition ARN
   * @param {string} clusterName - ECS cluster name
   * @param {string} targetGroupArn - Optional target group ARN for load balancing
   * @param {string} containerName - Container name for load balancer
   * @param {number} containerPort - Container port for load balancer
   * @param {Array<string>} subnets - Subnet IDs for Fargate tasks
   * @param {string} securityGroup - Security group ID for Fargate tasks
   * @param {string} useIAM - IAM profile to use
   * @returns {Promise<object>} Service creation response
   */
  const createECSService = async (
    serviceName,
    taskDefArn,
    clusterName,
    targetGroupArn = null,
    containerName = null,
    containerPort = null,
    subnets = [],
    securityGroup = null,
    useIAM,
  ) => {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ecsClient = factory.createClient(ECSClient);

    // First check if service already exists
    try {
      const describeResponse = await ecsClient.send(
        new DescribeServicesCommand({
          cluster: clusterName,
          services: [serviceName],
        }),
      );

      const existingService = describeResponse.services?.[0];
      if (existingService && existingService.status !== "INACTIVE") {
        console.log(`Service ${serviceName} already exists, updating with new task definition...`);

        // Update existing service with new task definition
        const updateResponse = await ecsClient.send(
          new UpdateServiceCommand({
            cluster: clusterName,
            service: serviceName,
            taskDefinition: taskDefArn,
            forceNewDeployment: true,
          }),
        );

        console.log(`Updated ECS service: ${serviceName}`);
        return updateResponse.service;
      }
    } catch (error) {
      // Service doesn't exist or other error - proceed to create
      if (error.name !== "ServiceNotFoundException") {
        console.log(`Note: Could not check for existing service: ${error.message}`);
      }
    }

    // Service doesn't exist, create it
    const serviceParams = {
      cluster: clusterName,
      serviceName,
      taskDefinition: taskDefArn,
      launchType: "FARGATE", // Using Fargate launch type
      desiredCount: 1, // FARGATE uses REPLICA scheduling with desired count
      deploymentConfiguration: {
        maximumPercent: 200,
        minimumHealthyPercent: 100,
      },
      // Fargate requires awsvpc network configuration
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: subnets,
          securityGroups: securityGroup ? [securityGroup] : [],
          assignPublicIp: "ENABLED", // Required for pulling images from DockerHub
        },
      },
    };

    // Add load balancer configuration if provided
    if (targetGroupArn && containerName && containerPort) {
      serviceParams.loadBalancers = [
        {
          targetGroupArn,
          containerName,
          containerPort,
        },
      ];
    }

    try {
      const command = new CreateServiceCommand(serviceParams);
      const response = await ecsClient.send(command);
      console.log(`Created ECS service: ${serviceName}`);
      return response.service;
    } catch (error) {
      console.error(`\n\n========== ECS SERVICE CREATION ERROR ==========`);
      console.error(`Service: ${serviceName}`);
      console.error(`Error: ${error.name} - ${error.message}`);
      if (error.$metadata) {
        console.error(`HTTP Status: ${error.$metadata.httpStatusCode}`);
      }
      console.error(`\nService Parameters:`);
      console.error(JSON.stringify(serviceParams, null, 2));
      console.error(`================================================\n\n`);

      // Also write to a debug file
      const debugPath = path.join(process.cwd(), "ecs-service-error.json");
      try {
        fs.writeFileSync(
          debugPath,
          JSON.stringify(
            {
              serviceName,
              error: {
                name: error.name,
                message: error.message,
                metadata: error.$metadata,
              },
              serviceParams,
            },
            null,
            2,
          ),
        );
        console.error(`Debug info written to: ${debugPath}`);
      } catch (e) {
        // Ignore write errors
      }

      throw error;
    }
  };

  /**
   * Create and deploy an ECS task using AWS SDK (replaces ecs-cli compose)
   * @param {string} yaml - The name of the YAML file to create
   * @param {object} task - The Docker Compose task definition
   * @param {string} name - The name of the ECS service
   * @param {number} port - The port for the ECS service
   * @param {string} targGroupARN - The target group ARN for the ECS service
   * @param {Array<string>} subnetsParam - Array of subnet IDs for Fargate tasks
   * @param {string} ecsSecurityGroupIDParam - Security group ID for Fargate tasks
   * @returns {Promise} - A promise that resolves when the ECS task is created
   */
  const ecsCompose = async (
    yaml,
    task,
    name,
    port = 0,
    targGroupARN = false,
    subnetsParam,
    ecsSecurityGroupIDParam,
  ) => {
    let waitAttempts = 0;
    const maxWaitAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)

    /**
     * Wait for the ECS cluster to be ready, then deploy the service
     * For Fargate, cluster just needs to exist (no EC2 instances needed)
     * @returns {Promise} - A promise that resolves when deployment completes
     */
    const waitForCluster = async () => {
      try {
        console.log(`Verifying ECS cluster exists: "${ECSName}"`);
        const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const ecsClient = factory.createClient(ECSClient);
        const response = await ecsClient.send(new DescribeClustersCommand({ clusters: [ECSName] }));

        const cluster = response.clusters?.[0];
        if (!cluster) {
          throw new Error(`Cluster ${ECSName} not found`);
        }

        console.log(`ECS cluster ready. Deploying Fargate service...`);
        // For Fargate, we don't need to wait for EC2 instances - deploy immediately
        return await deployService();
      } catch (error) {
        console.error(`Error checking cluster: ${error.message}`);
        throw error;
      }
    };

    /**
     * Deploy the ECS service using AWS SDK
     * @returns {Promise} - A promise that resolves when deployment completes
     */
    const deployService = async () => {
      // 1. Write YAML file (for debugging/reference)
      const yamlPath = path.join(process.cwd(), "ECStasks", yaml);
      await fs.promises.writeFile(yamlPath, jsYaml.dump(task), "utf8");
      console.log(`Wrote ECS task definition to ${yaml}`);

      // 2. Convert Docker Compose to ECS Task Definition
      const serviceName = Object.keys(task.services)[0];
      const composeService = task.services[serviceName];
      const taskDefParams = convertComposeToTaskDef(
        composeService,
        name,
        serviceName,
        executionRoleArn,
      );

      // 3. Register Task Definition
      console.log(`Registering task definition for ${name}`);
      const taskDefArn = await registerECSTaskDefinition(taskDefParams, useIAM);

      // 4. Create Service
      console.log(`Creating ECS service for ${name}`);
      await createECSService(
        name,
        taskDefArn,
        ECSName,
        targGroupARN,
        serviceName,
        port,
        subnetsParam, // Pass subnets from parameters
        ecsSecurityGroupIDParam, // Pass security group from parameters
        useIAM,
      );

      console.log(`Successfully deployed ${name}`);
    };

    // Update awsResources
    try {
      updateAwsResourcesField("ECSName", ECSName);
      console.log("Updated awsResources with ECS information");
    } catch (error) {
      console.error("Unable to update awsResources.js:", error);
    }

    console.log("Waiting for ECS cluster to start...");
    return await waitForCluster();
  };

  // Load pushkin.yaml to check for existing RabbitMQ credentials
  let pushkinConfig;
  try {
    const configContent = await fs.promises.readFile(
      path.join(process.cwd(), "pushkin.yaml"),
      "utf8",
    );
    pushkinConfig = jsYaml.load(configContent);
  } catch (e) {
    console.error("Failed to load pushkin.yaml");
    throw e;
  }

  // Use existing RabbitMQ credentials if available, otherwise generate new ones
  let rabbitPW, rabbitCookie;
  if (
    pushkinConfig.rabbitmq &&
    pushkinConfig.rabbitmq.password &&
    pushkinConfig.rabbitmq.erlangCookie
  ) {
    console.log("Using existing RabbitMQ credentials from pushkin.yaml");
    rabbitPW = pushkinConfig.rabbitmq.password;
    rabbitCookie = pushkinConfig.rabbitmq.erlangCookie;
  } else {
    console.log("Generating new RabbitMQ credentials");
    // Use crypto.randomBytes for secure password generation
    rabbitPW = crypto.randomBytes(16).toString("hex");
    rabbitCookie = uuid();

    // Save to pushkin.yaml
    if (!pushkinConfig.rabbitmq) {
      pushkinConfig.rabbitmq = {};
    }
    pushkinConfig.rabbitmq.password = rabbitPW;
    pushkinConfig.rabbitmq.erlangCookie = rabbitCookie;

    try {
      await fs.promises.writeFile(
        path.join(process.cwd(), "pushkin.yaml"),
        jsYaml.dump(pushkinConfig),
        "utf8",
      );
      console.log("Saved RabbitMQ credentials to pushkin.yaml");
    } catch (e) {
      console.error("Failed to save RabbitMQ credentials to pushkin.yaml");
      throw e;
    }
  }

  const rabbitUser = projName.replace(/[^A-Za-z0-9]/g, "");
  const rabbitAddress = "amqp://"
    .concat(rabbitUser)
    .concat(":")
    .concat(rabbitPW)
    .concat("@localhost:5672");
  let myRabbitTask = JSON.parse(JSON.stringify(rabbitTask));
  myRabbitTask.services["message-queue"].environment.RABBITMQ_DEFAULT_USER = rabbitUser;
  myRabbitTask.services["message-queue"].environment.RABBITMQ_DEFAULT_PASS = rabbitPW;
  myRabbitTask.services["message-queue"].environment.RABBITMQ_ERLANG_COOKIE = rabbitCookie;
  myRabbitTask.services["message-queue"].logging.options["awslogs-group"] = `ecs/${projName}`;
  myRabbitTask.services["message-queue"].logging.options["awslogs-stream-prefix"] =
    `ecs/rabbit/${projName}`;
  apiTask.services["api"].environment.AMQP_ADDRESS = rabbitAddress;
  apiTask.services["api"].image = `${DHID}/api:latest`;
  apiTask.services["api"].logging.options["awslogs-group"] = `ecs/${projName}`;
  apiTask.services["api"].logging.options["awslogs-stream-prefix"] = `ecs/api/${projName}`;

  let docker_compose;
  try {
    docker_compose = jsYaml.load(
      fs.readFileSync(path.join(process.cwd(), "pushkin/docker-compose.dev.yml"), "utf8"),
    );
  } catch (e) {
    console.error("Failed to load the docker-compose. That is extremely odd.");
    throw e;
  }

  let workerList = [];
  Object.keys(docker_compose.services).forEach((s) => {
    if (
      docker_compose.services[s].labels != null &&
      docker_compose.services[s].labels.isPushkinWorker
    ) {
      workerList.push(s);
    }
  });

  console.log(`ECS task creation waiting on DBs`);
  await completedDBs; //Next part won't run if DBs aren't done
  const dbInfoByTask = await getDBInfo();

  let composedRabbit;
  let composedAPI;
  let composedWorkers;
  composedRabbit = ecsCompose(
    "rabbitTask.yml",
    myRabbitTask,
    "message-queue",
    0,
    false,
    subnets,
    ecsSecurityGroupID,
  );
  composedAPI = ecsCompose(
    "apiTask.yml",
    apiTask,
    "api",
    80,
    targGroupARN,
    subnets,
    ecsSecurityGroupID,
  );
  composedWorkers = workerList.map((w) => {
    const yaml = w.concat(".yml");
    const name = w;
    let task = {};
    let expName = w.split("_worker")[0];
    task.version = workerTask.version;
    task.services = {};
    task.services[w] = workerTask.services["EXPERIMENT_NAME"];
    task.services[w].image = `${DHID}/${w}:latest`;
    task.services[w].logging.options["awslogs-group"] = `ecs/${projName}`;
    task.services[w].logging.options["awslogs-stream-prefix"] = `ecs/${w}/${projName}`;
    //Note that "DB_USER", "DB_NAME", "DB_PASS", "DB_URL" are redundant with "DB_SMARTURL"
    //For simplicity, newer versions of pushkin-worker will expect DB_SMARTURL
    //However, existing deploys won't have that. So both sets of information are maintained
    //for backwards compatibility, at least for the time being.
    task.services[w].environment = {
      AMQP_ADDRESS: rabbitAddress,
      DB_HOST: dbInfoByTask["Main"].endpoint,
      DB_USER: dbInfoByTask["Main"].username,
      DB_DB: dbInfoByTask["Main"].name,
      DB_PASS: dbInfoByTask["Main"].password,
      DB_URL: dbInfoByTask["Main"].endpoint,
      //"TRANS_URL": `postgres://${dbInfoByTask['Transaction'].username}:${dbInfoByTask['Transaction'].password}@${dbInfoByTask['Transaction'].endpoint}:/${dbInfoByTask['Transaction'].port}/${dbInfoByTask['Transaction'].name}`
      TRANS_HOST: dbInfoByTask["Transaction"].endpoint,
      TRANS_USER: dbInfoByTask["Transaction"].username,
      TRANS_DB: dbInfoByTask["Transaction"].name,
      TRANS_PASS: dbInfoByTask["Transaction"].password,
      TRANS_URL: dbInfoByTask["Transaction"].endpoint,
    };
    return ecsCompose(yaml, task, name, 0, false, subnets, ecsSecurityGroupID);
  });

  return Promise.all([composedRabbit, composedAPI, composedWorkers]);
};

/**
 * Set up ECS cluster and related resources:
 * - Security groups and SSH keys
 * - Load balancers and target groups
 * - Auto-scaling configuration
 * - Network setup (VPC, subnets)
 * @param {string} projName - The name of the project
 * @param {string} awsName - The name of the AWS account
 * @param {boolean} useIAM - Whether to use IAM roles
 * @param {string} DHID - The Docker Hub ID
 * @param {Promise} completedDBs - A promise that resolves when the databases are set up
 * @param {string} myCertificate - The certificate for the project
 * @returns {Promise} - A promise that resolves when the ECS setup is complete
 */
const setupECS = async (projName, awsName, useIAM, DHID, completedDBs, myCertificate) => {
  console.log(`Starting ECS setup`);
  let temp;

  /**
   * Create an SSH key pair
   * @param {boolean} useIAM - Whether to use IAM roles
   */
  const makeSSH = async (useIAM) => {
    let keyPairs;
    let foundPushkinKeyPair = false;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ec2Client = factory.createClient(EC2Client);
      const describeKeyPairsResponse = await ec2Client.send(new DescribeKeyPairsCommand({}));
      keyPairs = { stdout: JSON.stringify({ KeyPairs: describeKeyPairsResponse.KeyPairs }) };
    } catch (e) {
      console.error(`Failed to get list of key pairs`);
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
      let keyPair;
      try {
        console.error(`Making SSH key`);
        const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const ec2Client = factory.createClient(EC2Client);
        const createKeyPairResponse = await ec2Client.send(
          new CreateKeyPairCommand({
            KeyName: "my-pushkin-key-pair",
          }),
        );
        // Write the key material to file
        await require("fs").promises.writeFile("pushkinKey", createKeyPairResponse.KeyMaterial);
        await exec(`chmod 400 .pushkinKey`);
      } catch (e) {
        console.error(`Problem creating AWS SSH key`);
      }
      return;
    }
  };

  let madeSSH = makeSSH(useIAM);

  /**
   * make security group for load balancer. Start this process early, though it doesn't take super long.
   * @param {any} useIAM -- The IAM role to use
   * @param {string} projName -- The project name
   * @returns {Promise<string>} - The project name
   */
  const makeBalancerGroup = async (useIAM, projName) => {
    console.log(`Creating security group for load balancer`);
    let groupId;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ec2Client = factory.createClient(EC2Client);

      // Create security group
      const createSGResponse = await ec2Client.send(
        new CreateSecurityGroupCommand({
          GroupName: "BalancerGroup",
          Description: "For the load balancer",
          TagSpecifications: [
            {
              ResourceType: "security-group",
              Tags: [
                {
                  Key: PROJECT_TAG_KEY,
                  Value: projName,
                },
              ],
            },
          ],
        }),
      );
      groupId = createSGResponse.GroupId;

      // Add rules for HTTP and HTTPS
      await Promise.all([
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupName: "BalancerGroup",
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 80,
                ToPort: 80,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupName: "BalancerGroup",
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 443,
                ToPort: 443,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
      ]);
    } catch (e) {
      console.error(`Failed to create security group for load balancer`);
      throw e;
    }
    return groupId; //remember security group in order to use later!
  };

  let securityGroups;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ec2Client = factory.createClient(EC2Client);
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    securityGroups = {
      stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
    };
  } catch (e) {
    console.error(`Failed to retrieve list of security groups from aws`);
    throw e;
  }
  let foundBalancerGroup = false;
  let madeBalancerGroup;
  let BalancerSecurityGroupID;
  JSON.parse(securityGroups.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == "BalancerGroup") {
      foundBalancerGroup = g.GroupId;
    }
  });
  if (foundBalancerGroup) {
    console.log(`Security group 'BalancerGroup' already exists. Skipping create.`);
    BalancerSecurityGroupID = foundBalancerGroup;
  } else {
    try {
      madeBalancerGroup = makeBalancerGroup(useIAM, projName); //start this process early. Will use much later.
    } catch (e) {
      throw e;
    }
  }

  //make security group for ECS cluster. Start this process early, though it doesn't take super long.
  /**
   *
   * @param useIAM
   * @param projName
   */
  const makeECSGroup = async (useIAM, projName) => {
    console.log(`Creating security group for ECS cluster`);
    let groupId;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ec2Client = factory.createClient(EC2Client);

      const createSecurityGroupResponse = await ec2Client.send(
        new CreateSecurityGroupCommand({
          GroupName: "ECSGroup",
          Description: "For the ECS cluster",
          TagSpecifications: [
            {
              ResourceType: "security-group",
              Tags: [
                {
                  Key: PROJECT_TAG_KEY,
                  Value: projName,
                },
              ],
            },
          ],
        }),
      );

      groupId = createSecurityGroupResponse.GroupId;

      // Add ingress rules
      await Promise.all([
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: groupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 80,
                ToPort: 80,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: groupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 22,
                ToPort: 22,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
        ec2Client.send(
          new AuthorizeSecurityGroupIngressCommand({
            GroupId: groupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 1024,
                ToPort: 65535,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              },
            ],
          }),
        ),
      ]);
    } catch (e) {
      console.error(`Failed to create security group for ECS cluster`);
      throw e;
    }
    return groupId;
  };

  let ecsSecurityGroupID;
  let foundECSGroup = false;
  let madeECSGroup;
  JSON.parse(securityGroups.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == "ECSGroup") {
      foundECSGroup = g.GroupId;
    }
  });
  if (foundECSGroup) {
    console.log(`Security group 'foundECSGroup' already exists. Skipping create.`);
    ecsSecurityGroupID = foundECSGroup;
  } else {
    madeECSGroup = makeECSGroup(useIAM, projName); //start this process early. Will use much later.
  }

  //need one subnet per availability zone in region. Region is based on region for the profile.
  //Start this process early to use later.
  const foundSubnets = new Promise(async (resolve, reject) => {
    console.log(`Retrieving subnets for AWS zone`);
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
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
  /**
   *
   * @param useIAM
   */
  const getVPC = async (useIAM) => {
    console.log("getting default VPC");
    let describeVpcsResponse;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
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
  try {
    gotVPC = getVPC(useIAM);
  } catch (e) {
    throw e;
  }

  let mkTaskDir;
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

  //Everything past here requires the ECS CLI having been set up
  console.log("Configuring ECS CLI");
  let aws_access_key_id;
  let aws_secret_access_key;
  try {
    aws_access_key_id = execSync(
      `aws configure get aws_access_key_id --profile ${useIAM}`,
    ).toString();
    aws_secret_access_key = execSync(
      `aws configure get aws_secret_access_key --profile ${useIAM}`,
    ).toString();
  } catch (e) {
    console.error(
      `Unable to load AWS credentials for ${useIAM}. Are you sure you have this profile configured for the AWS CLI?`,
    );
    throw e;
  }

  const ECSName = projName.replace(/[^A-Za-z0-9]/g, "");
  // ECS-CLI configuration removed - now using AWS SDK directly

  let launchedECS;
  madeSSH = await madeSSH; //need this shortly
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

  if (!ecsSecurityGroupID) {
    //If we didn't find one, we must be making it
    console.log("Waiting for ecsSecurityGroupID");
    ecsSecurityGroupID = await madeECSGroup;
  }
  const myVPC = await gotVPC;
  try {
    console.log("Launching ECS cluster");
    //Note that cluster is named here, although that should match the default anyway.
    // ecs-cli uses the deprecated Launch Configuration, which AWS is phasing out in favor of
    // Launch Templates and Fargate over ECS EC2. However, as of this writing (2025-09) ecs-cli does not support Launch Templates.
    // Switching to using AWS CLI in this branch, but opening up a new branch to try out migrating to AWS Copilot CLI
    // Create ECS cluster using AWS SDK instead of deprecated ecs-cli
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ecsClient = factory.createClient(ECSClient);
    try {
      const createClusterResponse = await ecsClient.send(
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
  if (!foundBalancerGroup) {
    BalancerSecurityGroupID = await madeBalancerGroup;
  }
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
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
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
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
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
  let madeListener;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    madeListener = await elbv2Client.send(
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
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
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
  try {
    console.log("Creating ECS tasks");
    createdECSTasks = ecsTaskCreator(
      projName,
      useIAM,
      DHID,
      completedDBs,
      ECSName,
      targGroupARN,
      subnets,
      ecsSecurityGroupID,
    );
  } catch (e) {
    throw e;
  }
  createdECSTasks = await createdECSTasks;
  console.log(`Created ECS task definitions`);

  return [balancerEndpoint, balancerZone];
};

/**
 *
 * @param useIAM
 * @param killTag
 */
const deleteStack = async (useIAM, killTag) => {
  console.log(`Deleting cloudformation stacks`);
  /**
   *
   * @param stackType
   */
  const getStackList = async (stackType) => {
    let stacksToDelete = [];
    let stackList;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const cloudFormationClient = factory.createClient(CloudFormationClient);
      const listStacksResponse = await cloudFormationClient.send(new ListStacksCommand({}));
      stackList = { stdout: JSON.stringify({ StackSummaries: listStacksResponse.StackSummaries }) };
    } catch (e) {
      console.error(`Unable to list cloudformation stacks`);
      throw e;
    }
    if (JSON.parse(stackList.stdout).StackSummaries) {
      JSON.parse(stackList.stdout).StackSummaries.forEach((s) => {
        if (stackType == "deletable") {
          if ((s.StackStatus == "Active") | (s.StackStatus == "CREATE_COMPLETE")) {
            if (killTag && s.Tags.length > 0) {
              if (s.Tags[0].Value == killTag) {
                stacksToDelete.push(s.StackId);
              }
            } else {
              stacksToDelete.push(s.StackId);
            }
          }
        }
        if (stackType == "alive") {
          if (s.StackStatus != "DELETE_COMPLETE") {
            if (killTag && s.Tags.length > 0) {
              if (s.Tags[0].Value == killTag) {
                stacksToDelete.push(s.StackId);
              }
            } else {
              stacksToDelete.push(s.StackId);
            }
          }
        }
      });
    }
    return stacksToDelete;
  };

  let stacksToDelete;
  try {
    stacksToDelete = await getStackList("deletable");
  } catch (e) {
    throw e;
  }

  return new Promise(async (resolve, reject) => {
    if (stacksToDelete.length > 0) {
      stacksToDelete.map(async (s) => {
        console.log(`Deleting stack ${s}`);
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const cloudFormationClient = factory.createClient(CloudFormationClient);
          return await cloudFormationClient.send(new DeleteStackCommand({ StackName: s }));
        } catch (e) {
          console.warn(
            "\x1b[31m%s\x1b[0m",
            `Unable to find cloudformation stack ${s}. May have already been deleted. Skipping.`,
          );
          return true;
        }
      });

      /**
       *
       */
      const awaitStacks = async () => {
        let remainingStacks = [];
        try {
          remainingStacks = await getStackList("alive");
        } catch (e) {
          throw e;
        }
        if (remainingStacks.length > 0) {
          setTimeout(awaitStacks, 5000);
        } else {
          resolve(true);
        }
      };
      try {
        awaitStacks();
      } catch (e) {
        throw e;
      }
    } else {
      resolve(true);
    }
  });
};

/**
 *
 * @param deletedStack
 * @param useIAM
 * @param killTag
 * @param projName
 * @param awsResources
 */
const deleteCluster = async (deletedStack, useIAM, killTag, projName, awsResources) => {
  deletedStack = await deletedStack; //probably need this gone first.
  console.log(`Deleted stack: ${deletedStack}`);
  let runningClusters = [];
  let clustersToKill = [];
  let temp;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ecsClient = factory.createClient(ECSClient);
    const listClustersResponse = await ecsClient.send(new ListClustersCommand({}));
    temp = { stdout: JSON.stringify({ clusterArns: listClustersResponse.clusterArns }) };
  } catch (e) {
    console.error(`Unable to list ECS clusters.\n` + e);
    throw e;
  }
  if (JSON.parse(temp.stdout).clusterArns.length > 0) {
    JSON.parse(temp.stdout).clusterArns.map((c) => {
      runningClusters.push(c);
    });
  }

  if (!killTag) {
    clustersToKill = runningClusters;
  } else {
    console.warn(
      "\x1b[31m%s\x1b[0m",
      `Only nuking clusters associated with this project. Full list of clusters includes:`,
    );
    console.warn("\x1b[31m%s\x1b[0m", runningClusters);
    if (awsResources && !awsResources.ECSName) {
      awsResources.ECSName = projName.replace(/[^A-Za-z0-9]/g, ""); //won't be permanent. Doesn't matter.
    }
    let clusterDescription;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ecsClient = factory.createClient(ECSClient);
      const describeClustersResponse = await ecsClient.send(
        new DescribeClustersCommand({
          clusters: [awsResources.ECSName],
        }),
      );
      clusterDescription = {
        stdout: JSON.stringify({ clusters: describeClustersResponse.clusters }),
      };
    } catch (e) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`,
      );
      awsResources.ECSName = null;
      return true;
    }
    if (JSON.parse(clusterDescription.stdout).clusters.length == 0) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`,
      );
      awsResources.ECSName = null;
      return true;
    } else {
      JSON.parse(clusterDescription.stdout).clusters.forEach((c) => {
        if (c.clusterName == awsResources.ECSName) {
          clustersToKill.push(c.clusterArn);
        }
      });
      if (clustersToKill.length == 0) {
        console.warn(
          "\x1b[31m%s\x1b[0m",
          `Unable to find ECS cluster ${awsResources.ECSName}. May have already been deleted.`,
        );
        awsResources.ECSName = null;
        return true;
      }
    }
  }
  console.log(`Deleting these ECS clusters: ` + clustersToKill.join(", "));

  console.log(`Stopping ECS services.`);
  await Promise.all(
    clustersToKill.map(async (c) => {
      let aTaskToKill;
      try {
        const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const ecsClient = factory.createClient(ECSClient);
        const listTasksResponse = await ecsClient.send(
          new ListTasksCommand({
            cluster: c,
          }),
        );
        aTaskToKill = { stdout: JSON.stringify({ taskArns: listTasksResponse.taskArns }) };
      } catch (e) {
        console.error(`Unable to list tasks for cluster ${c}.`);
        throw e;
      }
      let tasksToKill = JSON.parse(aTaskToKill.stdout).taskArns;
      let killedTasks;
      if (tasksToKill.length > 0) {
        killedTasks = Promise.all(
          tasksToKill.map(async (t) => {
            console.log(`killing task: ` + t);
            const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
            const factory = new AWSClientFactory(AWS_REGION, profileName);
            const ecsClient = factory.createClient(ECSClient);
            return await ecsClient.send(
              new StopTaskCommand({
                cluster: c,
                task: t,
              }),
            );
          }),
        );
      }
      killedTasks = await killedTasks;

      //wait for tasks to stop
      while (true) {
        let aTaskToKill;
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const ecsClient = factory.createClient(ECSClient);
          const listTasksResponse = await ecsClient.send(
            new ListTasksCommand({
              cluster: c,
            }),
          );
          aTaskToKill = { stdout: JSON.stringify({ taskArns: listTasksResponse.taskArns }) };
        } catch (e) {
          console.error(`Unable to list tasks for cluster ${c}.`);
          throw e;
        }

        tasksToKill = JSON.parse(aTaskToKill.stdout).taskArns;

        if (tasksToKill.length === 0) {
          console.log("All tasks have stopped.");
          break;
        }

        console.log(`Waiting for ${tasksToKill.length} tasks to stop...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      /**
       *
       * @param clusterName
       * @param useIAM
       */
      async function deleteAllServices(clusterName, useIAM) {
        let servicesToDelete = [];
        let deletedServices = [];
        let aServiceToDelete;

        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const ecsClient = factory.createClient(ECSClient);
          const listServicesResponse = await ecsClient.send(
            new ListServicesCommand({
              cluster: clusterName,
            }),
          );
          aServiceToDelete = {
            stdout: JSON.stringify({ serviceArns: listServicesResponse.serviceArns }),
          };
        } catch (e) {
          console.error(`Unable to list services for cluster ${clusterName}.`);
          throw e;
        }

        servicesToDelete = JSON.parse(aServiceToDelete.stdout).serviceArns;

        if (servicesToDelete.length > 0) {
          deletedServices = Promise.all(
            servicesToDelete.map(async (s) => {
              console.log(`deleting service: ` + s);
              const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
              const factory = new AWSClientFactory(AWS_REGION, profileName);
              const ecsClient = factory.createClient(ECSClient);
              return await ecsClient.send(
                new DeleteServiceCommand({
                  cluster: clusterName,
                  service: s,
                  force: true,
                }),
              );
            }),
          );
        }

        await deletedServices;
        // Wait for services to be deleted
        while (true) {
          let servicesList;
          try {
            const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
            const factory = new AWSClientFactory(AWS_REGION, profileName);
            const ecsClient = factory.createClient(ECSClient);
            const listServicesResponse = await ecsClient.send(
              new ListServicesCommand({
                cluster: clusterName,
              }),
            );
            servicesList = {
              stdout: JSON.stringify({ serviceArns: listServicesResponse.serviceArns }),
            };
          } catch (e) {
            console.error(`Unable to list services for cluster ${clusterName}.`);
            throw e;
          }

          servicesToDelete = JSON.parse(servicesList.stdout).serviceArns;

          if (servicesToDelete.length === 0) {
            console.log("All services have been deleted.");
            break;
          }

          console.log(`Waiting for ${servicesToDelete.length} services to be deleted...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        console.log("All services have been deleted.");
        return true;
      }

      return deleteAllServices(c, useIAM);
    }),
  );
  let killedClusters = clustersToKill.map(async (c) => {
    console.log(`Deleting ECS Cluster ${c}.`);
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ecsClient = factory.createClient(ECSClient);
      temp = await ecsClient.send(
        new DeleteClusterCommand({
          cluster: c,
        }),
      );
    } catch (e) {
      console.error(`Unable to delete cluster ${c}.`);
      console.error(e);
    }
    return temp;
  });
  return killedClusters;
};

// Export all functions
export { ensureECSTaskExecutionRole, ecsTaskCreator, setupECS, deleteStack, deleteCluster };
