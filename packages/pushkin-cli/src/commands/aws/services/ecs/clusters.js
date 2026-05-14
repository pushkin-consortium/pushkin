/**
 * ECS Cluster Management
 * @module ecs/clusters
 */

import {
  ECSClient,
  CreateClusterCommand,
  ListClustersCommand,
  DescribeClustersCommand,
  ListTasksCommand,
  StopTaskCommand,
  DeleteClusterCommand,
  waitUntilTasksStopped,
} from "@aws-sdk/client-ecs";
import {
  CloudFormationClient,
  ListStacksCommand,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { AWS_REGION } from "../../constants.js";
import { deleteAllServices } from "./services.js";

/**
 * Create an ECS cluster for the project, or skip if it already exists.
 * WHY: ECS clusters are the logical grouping of resources for running containers.
 * @param {string} ECSName - Cluster name (alphanumeric project name)
 * @param {string} projName - Project name (for tagging)
 * @param {string} useIAM - IAM profile to use
 * @param {string} projectTagKey - Tag key for identifying Pushkin resources
 */
const createCluster = async (ECSName, projName, useIAM, projectTagKey) => {
  console.log("Launching ECS cluster");
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const ecsClient = factory.createClient(ECSClient);
  try {
    await ecsClient.send(
      new CreateClusterCommand({
        clusterName: ECSName,
        tags: [{ key: projectTagKey, value: projName }],
      }),
    );
    console.log(`Created ECS cluster: ${ECSName}`);
  } catch (error) {
    if (error.name === "ClusterAlreadyExistsException") {
      console.log(`ECS cluster ${ECSName} already exists, continuing...`);
    } else {
      console.error(`Unable to launch cluster ${ECSName}:`, error);
      throw error;
    }
  }
};

/**
 * Delete all CloudFormation stacks, optionally filtered by tag.
 * CloudFormation is the AWS service used to manage CRUD operations of AWS resources as a stack.
 * @param {string} useIAM - IAM profile to use
 * @param {string|null} killTag - If set, only delete stacks whose first tag value matches
 * @returns {Promise<boolean>} Resolves when all stacks are deleted
 */
const deleteStack = async (useIAM, killTag) => {
  console.log(`Deleting CloudFormation stacks`);

  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const cfClient = factory.createClient(CloudFormationClient);

  const listStacks = async () => {
    const response = await cfClient.send(new ListStacksCommand({}));
    return response.StackSummaries ?? [];
  };

  const isDeletable = (stack) =>
    stack.StackStatus === "CREATE_COMPLETE" || stack.StackStatus === "UPDATE_COMPLETE";

  // TODO: killize
  const matchesTag = (stack) =>
    !killTag || (stack.Tags?.length > 0 && stack.Tags[0].Value === killTag);

  const stacks = await listStacks();
  const stacksToDelete = stacks
    .filter((stack) => isDeletable(stack) && matchesTag(stack))
    .map((stack) => stack.StackId);

  if (stacksToDelete.length === 0) return true;

  // Send delete commands
  await Promise.all(
    stacksToDelete.map(async (stackId) => {
      console.log(`Deleting stack ${stackId}`);
      try {
        await cfClient.send(new DeleteStackCommand({ StackName: stackId }));
      } catch (error) {
        console.error(`Unable to delete stack ${stackId}:`, error);
        throw error;
      }
    }),
  );

  // Wait for stacks to be deleted
  await Promise.all(
    stacksToDelete.map((stackId) =>
      waitUntilStackDeleteComplete(
        { client: cfClient, maxWaitTime: 600, minDelay: 5, maxDelay: 30 },
        { StackName: stackId },
      ),
    ),
  );

  return true;
};

/**
 * Delete ECS cluster(s) and all running tasks and services within them.
 * Deletes CloudFormation stacks first, then stops tasks and services before removing clusters.
 * @param {string} useIAM - IAM profile to use
 * @param {boolean} killTag - If true, only delete the cluster for this project
 * @param {string} projName - Project name
 * @param {object} awsResources - Tracked AWS resource IDs
 * @returns {Promise} Resolves when clusters are deleted
 */
const deleteCluster = async (useIAM, killTag, projName, awsResources) => {
  await deleteStack(useIAM, killTag);

  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const ecsClient = factory.createClient(ECSClient);

  // Get all running clusters
  const { clusterArns } = await ecsClient.send(new ListClustersCommand({})).catch((error) => {
    console.error(`Unable to list ECS clusters:`, error);
    throw error;
  });

  let clustersToKill;

  // TODO: killize
  if (!killTag) {
    clustersToKill = clusterArns;
  } else {
    const ECSName = awsResources?.ECSName ?? projName.replace(/[^A-Za-z0-9]/g, "");
    console.warn(
      `Only deleting cluster for project "${projName}". All clusters: ${clusterArns.join(", ")}`,
    );

    const response = await ecsClient.send(new DescribeClustersCommand({ clusters: [ECSName] }));
    const activeCluster = response.clusters?.find(
      (c) => c.clusterName === ECSName && c.status !== "INACTIVE",
    );

    if (!activeCluster) {
      console.warn(`ECS cluster ${ECSName} not found or already deleted, skipping.`);
      return true;
    }

    clustersToKill = [activeCluster.clusterArn];
  }

  console.log(`Deleting ECS clusters: ${clustersToKill.join(", ")}`);

  // Stop all tasks and services in each cluster first
  await Promise.all(
    clustersToKill.map(async (clusterArn) => {
      const { taskArns } = await ecsClient
        .send(new ListTasksCommand({ cluster: clusterArn }))
        .catch((error) => {
          console.error(`Unable to list tasks for cluster ${clusterArn}:`, error);
          throw error;
        });

      if (taskArns.length > 0) {
        await Promise.all(
          taskArns.map((taskArn) => {
            console.log(`Stopping task: ${taskArn}`);
            return ecsClient.send(new StopTaskCommand({ cluster: clusterArn, task: taskArn }));
          }),
        );

        await Promise.all(
          taskArns.map((taskArn) =>
            waitUntilTasksStopped(
              { client: ecsClient, maxWaitTime: 600, minDelay: 5, maxDelay: 10 },
              { cluster: clusterArn, tasks: [taskArn] },
            ),
          ),
        );

        console.log("All tasks have stopped.");
      }

      await deleteAllServices(clusterArn, useIAM);
    }),
  );

  // Then delete the cluster(s)
  return Promise.all(
    clustersToKill.map(async (clusterArn) => {
      console.log(`Deleting ECS cluster ${clusterArn}.`);
      try {
        return await ecsClient.send(new DeleteClusterCommand({ cluster: clusterArn }));
      } catch (error) {
        if (error.name === "ClusterNotFoundException") {
          console.warn(`Cluster ${clusterArn} already deleted, skipping.`);
        } else {
          console.error(`Unable to delete cluster ${clusterArn}:`, error);
          throw error;
        }
      }
    }),
  );
};

export { createCluster, deleteCluster };
