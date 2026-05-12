/**
 * ECS Task Environment Builders
 * Builds configured Docker Compose task definition objects for RabbitMQ, API,
 * and experiment worker containers by cloning base templates from awsConfigs.js
 * and filling in project-specific values.
 * @module ecs/environment
 */

import { rabbitTask, apiTask, workerTask } from "../../awsConfigs.js";

/**
 * Builds a configured RabbitMQ task definition
 * @param {string} projName - Project name
 * @param {string} rabbitUser - RabbitMQ username
 * @param {string} rabbitPW - RabbitMQ password
 * @param {string} rabbitCookie - RabbitMQ Erlang cookie
 * @returns {object} Configured Docker Compose service definition
 */
const buildRabbitTask = (projName, rabbitUser, rabbitPW, rabbitCookie) => {
  const task = JSON.parse(JSON.stringify(rabbitTask));
  task.services["message-queue"].environment.RABBITMQ_DEFAULT_USER = rabbitUser;
  task.services["message-queue"].environment.RABBITMQ_DEFAULT_PASS = rabbitPW;
  task.services["message-queue"].environment.RABBITMQ_ERLANG_COOKIE = rabbitCookie;
  task.services["message-queue"].logging.options["awslogs-group"] = `ecs/${projName}`;
  task.services["message-queue"].logging.options["awslogs-stream-prefix"] =
    `ecs/rabbit/${projName}`;
  return task;
};

/**
 * Builds a configured API task definition
 * @param {string} projName - Project name
 * @param {string} DHID - Docker Hub ID
 * @param {string} rabbitAddress - Full AMQP connection string
 * @returns {object} Configured Docker Compose service definition
 */
const buildAPITask = (projName, DHID, rabbitAddress) => {
  const task = JSON.parse(JSON.stringify(apiTask));
  task.services["api"].environment.AMQP_ADDRESS = rabbitAddress;
  task.services["api"].image = `${DHID}/api:latest`;
  task.services["api"].logging.options["awslogs-group"] = `ecs/${projName}`;
  task.services["api"].logging.options["awslogs-stream-prefix"] = `ecs/api/${projName}`;
  return task;
};

/**
 * Builds a configured worker task definition for a single experiment worker
 * @param {string} workerName - Worker service name (experiment name)
 * @param {string} projName - Project name
 * @param {string} DHID - Docker Hub ID
 * @param {string} rabbitAddress - Full AMQP connection string
 * @param {object} dbInfoByTask - Database connection info, keyed by DB type (Main, Transaction)
 * @returns {object} Configured Docker Compose service definition
 */
const buildWorkerTask = (workerName, projName, DHID, rabbitAddress, dbInfoByTask) => {
  const task = {
    version: workerTask.version,
    services: {},
  };
  task.services[workerName] = JSON.parse(JSON.stringify(workerTask.services["EXPERIMENT_NAME"]));
  task.services[workerName].image = `${DHID}/${workerName}:latest`;
  task.services[workerName].logging.options["awslogs-group"] = `ecs/${projName}`;
  task.services[workerName].logging.options["awslogs-stream-prefix"] =
    `ecs/${workerName}/${projName}`;
  task.services[workerName].environment = {
    AMQP_ADDRESS: rabbitAddress,
    DB_HOST: dbInfoByTask["Main"].endpoint,
    DB_USER: dbInfoByTask["Main"].username,
    DB_DB: dbInfoByTask["Main"].name,
    DB_PASS: dbInfoByTask["Main"].password,
    DB_URL: dbInfoByTask["Main"].endpoint,
    TRANS_HOST: dbInfoByTask["Transaction"].endpoint,
    TRANS_USER: dbInfoByTask["Transaction"].username,
    TRANS_DB: dbInfoByTask["Transaction"].name,
    TRANS_PASS: dbInfoByTask["Transaction"].password,
    TRANS_URL: dbInfoByTask["Transaction"].endpoint,
  };
  return task;
};

export { buildRabbitTask, buildAPITask, buildWorkerTask };
