/**
 * ECS Task Definition Operations
 * Handles task definition registration, environment configuration,
 * and service deployment for Pushkin deployments
 * @module ecs/tasks
 */

import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  DescribeClustersCommand,
} from "@aws-sdk/client-ecs";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../../utils/aws-resources.js";
import { AWS_REGION } from "../../constants.js";
import { ensureECSTaskExecutionRole } from "../iam.js";
import { getDBInfo } from "../rds.js";
import { buildRabbitTask, buildAPITask, buildWorkerTask } from "./environment.js";
import { createECSService } from "./services.js";
import path from "path";
import jsYaml from "js-yaml";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { createDirectory, readFile, writeFile } from "../../../../utils/file.js";
import { loadPushkinConfig, savePushkinConfig } from "../../../../utils/pushkin-config.js";

/**
 * (Helper)
 * Convert Docker Compose YAML to ECS Task Definition format
 * WHY: AWS ECS can use Docker Compose files as a reference, but we need to convert them into the
 * specific format required for ECS task definitions. This function takes a single service definition
 * from a Docker Compose file and translates it into the parameters needed to register an ECS task
 * definition, including handling memory/CPU requirements, port mappings, environment variables,
 * and logging configuration.
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
 * Register an ECS task definition with AWS
 * @param {object} taskDefParams - Task definition parameters
 * @param {string} useIAM - IAM profile to use
 * @returns {Promise<string>} Task definition ARN
 */
const registerECSTaskDefinition = async (taskDefParams, useIAM) => {
  const profileName = useIAM;
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
    console.error(`Failed to register task definition ${taskDefParams.family}:`, error);
    throw error;
  }
};

/**
 * (Helper)
 * Create ECS tasks for the API and worker containers
 * @param {string} projName - The name of the project
 * @param {boolean} useIAM - Whether to use IAM roles
 * @param {string} DHID - The DockerHub ID
 * @param {Array} completedDBs - The list of completed databases
 * @param {string} ECSName - The name of the ECS cluster
 * @param {string} targGroupARN - The target group ARN
 * @param {Array<string>} subnets - Array of subnet IDs for Fargate tasks
 * @param {string} ecsSecurityGroupID - Security group ID for Fargate tasks
 * @returns {Promise} - A promise that resolves when the ECS tasks are created
 */
const createECSTask = async (
  projName,
  useIAM,
  DHID,
  completedDBs,
  ECSName,
  targGroupARN,
  subnets,
  ecsSecurityGroupID,
) => {
  createDirectory(path.join(process.cwd(), "ECStasks"));

  const executionRoleArn = await ensureECSTaskExecutionRole(useIAM);

  /**
   * (Helper)
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
    /**
     * Wait for the ECS cluster to be ready, then deploy the service
     * For Fargate, cluster just needs to exist (no EC2 instances needed)
     * @returns {Promise} - A promise that resolves when deployment completes
     */
    const waitForCluster = async () => {
      try {
        console.log(`Verifying ECS cluster exists: "${ECSName}"`);
        const profileName = useIAM;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const ecsClient = factory.createClient(ECSClient);
        const response = await ecsClient.send(new DescribeClustersCommand({ clusters: [ECSName] }));

        const cluster = response.clusters?.[0];
        if (!cluster) {
          throw new Error(`Cluster ${ECSName} not found`);
        }

        console.log(`ECS cluster ready. Deploying Fargate service...`);
        return await deployService();
      } catch (error) {
        console.error(`Error checking cluster:`, error);
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
      writeFile(yamlPath, jsYaml.dump(task));
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
    pushkinConfig = loadPushkinConfig();
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
    rabbitPW = crypto.randomBytes(16).toString("hex");
    rabbitCookie = uuid();

    // Save to pushkin.yaml
    if (!pushkinConfig.rabbitmq) {
      pushkinConfig.rabbitmq = {};
    }
    pushkinConfig.rabbitmq.password = rabbitPW;
    pushkinConfig.rabbitmq.erlangCookie = rabbitCookie;

    try {
      savePushkinConfig(pushkinConfig);
      console.log("Saved RabbitMQ credentials to pushkin.yaml");
    } catch (e) {
      console.error("Failed to save RabbitMQ credentials to pushkin.yaml");
      throw e;
    }
  }

  const rabbitUser = projName.replace(/[^A-Za-z0-9]/g, "");
  const rabbitAddress = `amqp://${rabbitUser}:${rabbitPW}@localhost:5672`;
  const myRabbitTask = buildRabbitTask(projName, rabbitUser, rabbitPW, rabbitCookie);
  const myAPITask = buildAPITask(projName, DHID, rabbitAddress);

  let docker_compose;
  try {
    docker_compose = jsYaml.load(
      readFile(path.join(process.cwd(), "pushkin/docker-compose.dev.yml"), "utf8"),
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
    myAPITask,
    "api",
    80,
    targGroupARN,
    subnets,
    ecsSecurityGroupID,
  );
  composedWorkers = workerList.map((w) => {
    const task = buildWorkerTask(w, projName, DHID, rabbitAddress, dbInfoByTask);
    return ecsCompose(w.concat(".yml"), task, w, 0, false, subnets, ecsSecurityGroupID);
  });

  return Promise.all([composedRabbit, composedAPI, composedWorkers]);
};

export { convertComposeToTaskDef, registerECSTaskDefinition, createECSTask };
