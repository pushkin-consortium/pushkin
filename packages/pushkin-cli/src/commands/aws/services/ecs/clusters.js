/**
 * ECS Cluster Management
 * Handles ECS cluster lifecycle and CloudFormation stack cleanup for Pushkin deployments
 * @module ecs/clusters
 */

import {
  ECSClient,
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
} from "@aws-sdk/client-cloudformation";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { AWS_REGION } from "../../constants.js";
import { deleteAllServices } from "./services.js";

const deleteStack = async (useIAM, killTag) => {
  console.log(`Deleting cloudformation stacks`);
  const getStackList = async (stackType) => {
    let stacksToDelete = [];
    let stackList;
    try {
      const profileName = useIAM;
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
  stacksToDelete = await getStackList("deletable");

  return new Promise(async (resolve) => {
    if (stacksToDelete.length > 0) {
      stacksToDelete.map(async (s) => {
        console.log(`Deleting stack ${s}`);
        try {
          const profileName = useIAM;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const cloudFormationClient = factory.createClient(CloudFormationClient);
          return await cloudFormationClient.send(new DeleteStackCommand({ StackName: s }));
        } catch (error) {
          console.warn(
            "\x1b[31m%s\x1b[0m",
            `Unable to find cloudformation stack ${s}. May have already been deleted. Skipping.`,
          );
          return true;
        }
      });
      const awaitStacks = async () => {
        let remainingStacks = [];
        remainingStacks = await getStackList("alive");
        if (remainingStacks.length > 0) {
          setTimeout(awaitStacks, 5000);
        } else {
          resolve(true);
        }
      };
      awaitStacks();
    } else {
      resolve(true);
    }
  });
};

const deleteCluster = async (deletedStack, useIAM, killTag, projName, awsResources) => {
  deletedStack = await deletedStack; //probably need this gone first.
  console.log(`Deleted stack: ${deletedStack}`);
  let runningClusters = [];
  let clustersToKill = [];
  let temp;
  try {
    const profileName = useIAM;
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
      const profileName = useIAM;
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
    } catch (error) {
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
        const profileName = useIAM;
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
      // Create ECS client for this cluster
      const profileName = useIAM;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const ecsClient = factory.createClient(ECSClient);

      let killedTasks;
      if (tasksToKill.length > 0) {
        killedTasks = Promise.all(
          tasksToKill.map(async (t) => {
            console.log(`killing task: ` + t);
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

      // Wait for all tasks to stop in parallel
      await Promise.all(
        killedTasks.map(async (taskArn) => {
          await waitUntilTasksStopped(
            {
              client: ecsClient,
              maxWaitTime: 600, // 10 minutes
              minDelay: 5,
              maxDelay: 10,
            },
            { cluster: c, tasks: [taskArn] },
          );
        }),
      );
      console.log("All tasks have stopped.");

      return deleteAllServices(c, useIAM);
    }),
  );
  let killedClusters = clustersToKill.map(async (c) => {
    console.log(`Deleting ECS Cluster ${c}.`);
    try {
      const profileName = useIAM;
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

export { deleteStack, deleteCluster };
