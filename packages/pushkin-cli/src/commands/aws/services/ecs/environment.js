/**
 * ECS Task Environment Builders
 * Builds configured Docker Compose task definition objects for RabbitMQ, API,
 * and experiment worker containers by cloning base templates from awsConfigs.js
 * and filling in project-specific values.
 * @module aws/services/ecs/environment
 */

import { rabbitTask, apiTask, workerTask } from "../../awsConfigs.js";

/**
 * Build a configured RabbitMQ task definition
 * @param {string} projectName
 * @param {string} rabbitUser - RabbitMQ username
 * @param {string} rabbitPW - RabbitMQ password
 * @param {string} rabbitCookie - RabbitMQ Erlang cookie
 * @returns {object} Configured Docker Compose service definition
 */
function buildRabbitTask(projectName, rabbitUser, rabbitPW, rabbitCookie) {
  const task = structuredClone(rabbitTask);
  task.services["message-queue"].environment.RABBITMQ_DEFAULT_USER = rabbitUser;
  task.services["message-queue"].environment.RABBITMQ_DEFAULT_PASS = rabbitPW;
  task.services["message-queue"].environment.RABBITMQ_ERLANG_COOKIE = rabbitCookie;
  task.services["message-queue"].logging.options["awslogs-group"] = `ecs/${projectName}`;
  task.services["message-queue"].logging.options["awslogs-stream-prefix"] =
    `ecs/rabbit/${projectName}`;
  return task;
}

/**
 * Build a configured API task definition
 * @param {string} projectName
 * @param {string} DockerHubId
 * @param {string} rabbitAddress - Full AMQP connection string
 * @returns {object} Configured Docker Compose service definition
 */
function buildAPITask(projectName, DockerHubId, rabbitAddress) {
  const task = structuredClone(apiTask);
  task.services["api"].environment.AMQP_ADDRESS = rabbitAddress;
  task.services["api"].image = `${DockerHubId}/api:latest`;
  task.services["api"].logging.options["awslogs-group"] = `ecs/${projectName}`;
  task.services["api"].logging.options["awslogs-stream-prefix"] = `ecs/api/${projectName}`;
  return task;
}

/**
 * Build a configured worker task definition for a single experiment worker
 * @param {string} workerName - Worker service name (experiment name)
 * @param {string} projectName
 * @param {string} DockerHubId
 * @param {string} rabbitAddress - Full AMQP connection string
 * @param {object} dbInfoByTask - Database connection info, keyed by DB type (Main, Transaction)
 * @returns {object} Configured Docker Compose service definition
 */
function buildWorkerTask(workerName, projectName, DockerHubId, rabbitAddress, dbInfoByTask) {
  const task = {
    version: workerTask.version,
    services: {},
  };
  task.services[workerName] = structuredClone(workerTask.services["EXPERIMENT_NAME"]);
  task.services[workerName].image = `${DockerHubId}/${workerName}:latest`;
  task.services[workerName].logging.options["awslogs-group"] = `ecs/${projectName}`;
  task.services[workerName].logging.options["awslogs-stream-prefix"] =
    `ecs/${workerName}/${projectName}`;
  task.services[workerName].environment = {
    AMQP_ADDRESS: rabbitAddress,
    DB_HOST: dbInfoByTask["experiment"].endpoint,
    DB_USER: dbInfoByTask["experiment"].username,
    DB_DB: dbInfoByTask["experiment"].name,
    DB_PASS: dbInfoByTask["experiment"].password,
    DB_URL: dbInfoByTask["experiment"].endpoint,
    TRANS_HOST: dbInfoByTask["transaction"].endpoint,
    TRANS_USER: dbInfoByTask["transaction"].username,
    TRANS_DB: dbInfoByTask["transaction"].name,
    TRANS_PASS: dbInfoByTask["transaction"].password,
    TRANS_URL: dbInfoByTask["transaction"].endpoint,
  };
  return task;
}

export { buildRabbitTask, buildAPITask, buildWorkerTask };
