/**
 * ECS Task Definition Operations
 * Handles task definition registration, environment configuration,
 * and service deployment 
 * @module ecs/tasks
 */

import path from "path";
import jsYaml from "js-yaml";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  DescribeClustersCommand,
} from "@aws-sdk/client-ecs";
import { createDirectory, readFile, writeFile } from "../../../../utils/file.js";
import { AWS_REGION } from "../../constants.js";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { updateAwsResourcesField } from "../../utils/aws-resources.js";
import { loadPushkinConfig, savePushkinConfig } from "../../../../utils/pushkin-config.js";
import { ensureECSTaskExecutionRole } from "../iam.js";
import { getDBInfo } from "../rds.js";
import { buildRabbitTask, buildAPITask, buildWorkerTask } from "./environment.js";
import { createECSService } from "./services.js";

/**
 * Build ECS task definition from a Docker Compose service definition.
 * WHY: Docker Compose files need to be converted into the specific format required by ECS task
 * definitions, with parameters like memory/CPU requirements, port mappings, environment variables,
 * and logging configuration.
 * @param {object} composeService - Single service from docker-compose YAML
 * @param {string} family - Task definition family name
 * @param {string} serviceName - Name of the service
 * @param {string} executionRoleArn - ARN of the ECS task execution role
 * @returns {object} ECS Task Definition parameters
 */
const dockerComposeToECSTaskDefinition = (
  composeService,
  family,
  serviceName,
  executionRoleArn,
) => {
  const parseMemory = (mem) => {
    if (!mem) return 512;
    if (typeof mem === "number") return mem;
    return parseInt(mem.toString().replace(/[^0-9]/g, ""));
  };

  // Fargate memory options: 512, 1024, 2048, 3072, 4096, etc.
  const containerMemory = parseMemory(composeService.mem_limit);
  const taskMemory = Math.max(512, containerMemory);

  // Minimum CPU for each Fargate memory tier (AWS-defined valid combinations)
  const taskCPU =
    taskMemory <= 512 ? "256"
    : taskMemory <= 2048 ? "512"
    : taskMemory <= 8192 ? "1024"
    : taskMemory <= 16384 ? "2048"
    : taskMemory <= 30720 ? "4096"
    : taskMemory <= 61440 ? "8192"
    : "16384";

  const portMappings = [];
  if (composeService.ports) {
    composeService.ports.forEach((portDef) => {
      const [hostPort, containerPort] = portDef.split(":").map((p) => parseInt(p));
      portMappings.push({
        containerPort: containerPort || hostPort,
        protocol: "tcp",
        // NOTE: hostPort is not used in awsvpc network mode (Fargate requirement)
      });
    });
  }

  const environment = [];
  if (composeService.environment) {
    Object.entries(composeService.environment).forEach(([name, value]) => {
      environment.push({ name, value: String(value) });
    });
  }

  const containerDefinition = {
    name: serviceName,
    image: composeService.image,
    memory: containerMemory,
    essential: true,
    portMappings,
    environment,
  };

  if (composeService.logging) {
    containerDefinition.logConfiguration = {
      logDriver: composeService.logging.driver,
      options: composeService.logging.options,
    };
  }

  return {
    family,
    containerDefinitions: [containerDefinition],
    requiresCompatibilities: ["FARGATE"],
    networkMode: "awsvpc",
    cpu: taskCPU,
    memory: taskMemory.toString(),
    executionRoleArn,
  };
};

/**
 * Register an ECS task definition with AWS.
 * WHY: Before we can run tasks on ECS, we need to register the task definition with AWS.
 * @param {object} taskDefParams - Task definition parameters
 * @param {string} useIAM - IAM profile to use
 * @returns {Promise<string>} Task definition ARN
 */
const registerECSTaskDefinition = async (taskDefParams, useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const ecsClient = factory.createClient(ECSClient);

  try {
    const response = await ecsClient.send(new RegisterTaskDefinitionCommand(taskDefParams));
    console.log(
      `Registered task definition: ${response.taskDefinition.family}:${response.taskDefinition.revision}`,
    );
    return response.taskDefinition.taskDefinitionArn;
  } catch (error) {
    console.error(`Failed to register task definition ${taskDefParams.family}::`, error);
    throw error;
  }
};

/**
 * Convert a Docker Compose task definition and deploy it as a Fargate service.
 * @param {string} name - ECS service/task-family name
 * @param {object} task - Docker Compose service definition
 * @param {object} context - Shared deployment context
 * @param {string} context.ECSName - ECS cluster name
 * @param {string} context.useIAM - IAM profile to use
 * @param {string} context.executionRoleArn - ARN of the ECS task execution role
 * @param {Array<string>} context.subnets - Subnet IDs for the Fargate task
 * @param {string} context.ecsSecurityGroupID - Security group ID for the Fargate task
 * @param {object|null} loadBalancer - Load balancer attachment (null = no LB attachment)
 * @param {number} loadBalancer.port - Container port to forward traffic to
 * @param {string} loadBalancer.targetGroupARN - Target group ARN to register the service with
 */
const deployService = async (name, task, context, loadBalancer = null) => {
  const { ECSName, useIAM, executionRoleArn, subnets, ecsSecurityGroupID } = context;

  writeFile(path.join(process.cwd(), "ECStasks", `${name}.yml`), jsYaml.dump(task));

  const serviceName = Object.keys(task.services)[0];
  const taskDefParams = dockerComposeToECSTaskDefinition(
    task.services[serviceName],
    name,
    serviceName,
    executionRoleArn,
  );

  console.log(`Registering task definition for ${name}`);
  const taskDefArn = await registerECSTaskDefinition(taskDefParams, useIAM);

  console.log(`Creating ECS service for ${name}`);
  await createECSService(
    name,
    taskDefArn,
    ECSName,
    loadBalancer?.targetGroupARN ?? null,
    serviceName,
    loadBalancer?.port ?? null,
    subnets,
    ecsSecurityGroupID,
    useIAM,
  );

  console.log(`Successfully deployed ${name}`);
};

/**
 * Deploy all ECS services (RabbitMQ, API, and experiment workers).
 * WHY: This is the final step in the deployment process — takes all the infrastructure set up
 * earlier and actually deploys the application containers to run in the ECS cluster.
 * @param {string} projName - The name of the project
 * @param {string} useIAM - IAM role to use
 * @param {string} DHID - The DockerHub ID
 * @param {Promise} completedDBs - Resolves when the databases are ready
 * @param {string} ECSName - The name of the ECS cluster
 * @param {string} targGroupARN - The target group ARN
 * @param {Array<string>} subnets - Array of subnet IDs for Fargate tasks
 * @param {string} ecsSecurityGroupID - Security group ID for Fargate tasks
 * @returns {Promise} Resolves when all services are deployed
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

  try {
    updateAwsResourcesField("ECSName", ECSName);
    console.log("Updated awsResources with ECS information");
  } catch (error) {
    console.error("Unable to update awsResources.js:", error);
  }

  let pushkinConfig;
  try {
    pushkinConfig = loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }

  let rabbitPW, rabbitCookie;
  if (pushkinConfig.rabbitmq?.password && pushkinConfig.rabbitmq?.erlangCookie) {
    console.log("Using existing RabbitMQ credentials from pushkin.yaml");
    rabbitPW = pushkinConfig.rabbitmq.password;
    rabbitCookie = pushkinConfig.rabbitmq.erlangCookie;
  } else {
    console.log("Generating new RabbitMQ credentials");
    rabbitPW = crypto.randomBytes(16).toString("hex");
    rabbitCookie = uuid();

    if (!pushkinConfig.rabbitmq) pushkinConfig.rabbitmq = {};
    pushkinConfig.rabbitmq.password = rabbitPW;
    pushkinConfig.rabbitmq.erlangCookie = rabbitCookie;

    try {
      savePushkinConfig(pushkinConfig);
      console.log("Saved RabbitMQ credentials to pushkin.yaml");
    } catch (error) {
      console.error(`Failed to save RabbitMQ credentials to pushkin.yaml:`, error);
      throw error;
    }
  }

  const rabbitUser = projName.replace(/[^A-Za-z0-9]/g, "");
  const rabbitAddress = `amqp://${rabbitUser}:${rabbitPW}@localhost:5672`;

  let dockerCompose;
  try {
    dockerCompose = jsYaml.load(
      readFile(path.join(process.cwd(), "pushkin/docker-compose.dev.yml"), "utf8"),
    );
  } catch (error) {
    console.error(`Failed to load the docker-compose:`, error);
    throw error;
  }

  const workerList = Object.keys(dockerCompose.services).filter(
    (s) => dockerCompose.services[s].labels?.isPushkinWorker,
  );

  console.log(`ECS task creation waiting on DBs`);
  await completedDBs;
  const dbInfoByTask = await getDBInfo();

  console.log(`Verifying ECS cluster exists: "${ECSName}"`);
  const { clusters } = await new AWSClientFactory(AWS_REGION, useIAM)
    .createClient(ECSClient)
    .send(new DescribeClustersCommand({ clusters: [ECSName] }));
  if (!clusters?.[0]) throw new Error(`Cluster ${ECSName} not found`);

  const context = { ECSName, useIAM, executionRoleArn, subnets, ecsSecurityGroupID };

  const composedRabbit = deployService(
    "message-queue",
    buildRabbitTask(projName, rabbitUser, rabbitPW, rabbitCookie),
    context,
  );
  const composedAPI = deployService("api", buildAPITask(projName, DHID, rabbitAddress), context, {
    port: 80,
    targetGroupARN: targGroupARN,
  });
  const composedWorkers = workerList.map((worker) =>
    deployService(
      worker,
      buildWorkerTask(worker, projName, DHID, rabbitAddress, dbInfoByTask),
      context,
    ),
  );

  return Promise.all([composedRabbit, composedAPI, ...composedWorkers]);
};

export { createECSTask };
