/**
 * ECS Cluster Management
 * @module aws/services/ecs/clusters
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
import { getAwsProfile } from "../../utils/aws-profile.js";
import { loadAwsConfig } from "../../utils/aws-config.js";
import { AWS_REGION, PROJECT_TAG_KEY } from "../../constants.js";
import { deleteAllServices } from "./services.js";

function createEcsClient() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(ECSClient);
}

function createCFClient() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(CloudFormationClient);
}

/**
 * Create an ECS cluster for the project, or skip if it already exists.
 * WHY: ECS clusters are the logical grouping of resources for running containers.
 * @param {string} ecsName - Cluster name (alphanumeric project name)
 * @param {string} projectName - Project name (for tagging)
 */
async function createCluster(ecsName, projectName) {
  console.log("Launching ECS cluster");
  const ecsClient = createEcsClient();
  try {
    await ecsClient.send(
      new CreateClusterCommand({
        clusterName: ecsName,
        tags: [{ key: PROJECT_TAG_KEY, value: projectName }],
      }),
    );
    console.log(`Created ECS cluster: ${ecsName}`);
  } catch (error) {
    if (error.name === "ClusterAlreadyExistsException") {
      console.log(`ECS cluster ${ecsName} already exists, continuing...`);
    } else {
      console.error(`Unable to launch cluster ${ecsName}:`, error);
      throw error;
    }
  }
}

/**
 * Delete all CloudFormation stacks, optionally filtered by tag.
 * CloudFormation is the AWS service used to manage CRUD operations of AWS resources as a stack.
 * @param {string|null} killTag - If set, only delete stacks tagged with this project name
 * @returns {Promise<boolean>} Resolves when all stacks are deleted
 */
async function deleteStack(killTag) {
  console.log(`Deleting CloudFormation stacks`);

  const cfClient = createCFClient();

  let stacks;
  try {
    const response = await cfClient.send(new ListStacksCommand({}));
    stacks = response.StackSummaries ?? [];
  } catch (error) {
    console.error(`Unable to list CloudFormation stacks:`, error);
    throw error;
  }

  const isDeletable = (stack) =>
    stack.StackStatus === "CREATE_COMPLETE" || stack.StackStatus === "UPDATE_COMPLETE";

  // TODO: killize
  const matchesTag = (stack) => !killTag || stack.Tags?.some((tag) => tag.Value === killTag);

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
  const { stackDeletion } = loadAwsConfig().timeouts.cloudformation;
  await Promise.all(
    stacksToDelete.map((stackId) =>
      waitUntilStackDeleteComplete(
        {
          client: cfClient,
          maxWaitTime: stackDeletion.maxWaitTime,
          minDelay: stackDeletion.minDelay,
          maxDelay: stackDeletion.maxDelay,
        },
        { StackName: stackId },
      ),
    ),
  );

  return true;
}

/**
 * Delete ECS cluster(s) and all running tasks and services within them.
 * Deletes CloudFormation stacks first, then stops tasks and services before removing clusters.
 * @param {string|null} killTag - If set, only delete the cluster for this project
 * @param {string} projectName - Project name
 * @param {object} awsResources - Tracked AWS resource IDs
 * @returns {Promise} Resolves when clusters are deleted
 */
async function deleteCluster(killTag, projectName, awsResources) {
  await deleteStack(killTag);

  const ecsClient = createEcsClient();

  let clusterArns;
  try {
    const response = await ecsClient.send(new ListClustersCommand({}));
    clusterArns = response.clusterArns ?? [];
  } catch (error) {
    console.error(`Unable to list ECS clusters:`, error);
    throw error;
  }

  let clustersToKill;

  // TODO: killize
  if (!killTag) {
    clustersToKill = clusterArns;
  } else {
    const ecsName = awsResources?.ECSName ?? projectName.replace(/[^A-Za-z0-9]/g, "");
    console.warn(
      `Only deleting cluster for project "${projectName}". All clusters: ${clusterArns.join(", ")}`,
    );

    let describeResponse;
    try {
      describeResponse = await ecsClient.send(
        new DescribeClustersCommand({ clusters: [ecsName] }),
      );
    } catch (error) {
      console.error(`Unable to describe ECS cluster ${ecsName}:`, error);
      throw error;
    }
    const activeCluster = describeResponse.clusters?.find(
      (c) => c.clusterName === ecsName && c.status !== "INACTIVE",
    );

    if (!activeCluster) {
      console.warn(`ECS cluster ${ecsName} not found or already deleted, skipping.`);
      return true;
    }

    clustersToKill = [activeCluster.clusterArn];
  }

  console.log(`Deleting ECS clusters: ${clustersToKill.join(", ")}`);

  const { ecs: ecsTimeouts } = loadAwsConfig().timeouts;

  // Stop all tasks and services in each cluster first
  await Promise.all(
    clustersToKill.map(async (clusterArn) => {
      let taskArns;
      try {
        const response = await ecsClient.send(new ListTasksCommand({ cluster: clusterArn }));
        taskArns = response.taskArns ?? [];
      } catch (error) {
        console.error(`Unable to list tasks for cluster ${clusterArn}:`, error);
        throw error;
      }

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
              {
                client: ecsClient,
                maxWaitTime: ecsTimeouts.tasksStopped.maxWaitTime,
                minDelay: ecsTimeouts.tasksStopped.minDelay,
                maxDelay: ecsTimeouts.tasksStopped.maxDelay,
              },
              { cluster: clusterArn, tasks: [taskArn] },
            ),
          ),
        );

        console.log("All tasks have stopped.");
      }

      await deleteAllServices(clusterArn);
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
}

export { createCluster, deleteCluster };
