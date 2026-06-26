/**
 * AWS Autoscaling Setup
 * Configures SNS alarms, CloudWatch metrics, and autoscaling policies for a deployed Pushkin site.
 * @module aws/subcommands/autoscale
 */

import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";
import { SNSClient, CreateTopicCommand, SubscribeCommand } from "@aws-sdk/client-sns";
import { CloudWatchClient, PutMetricAlarmCommand } from "@aws-sdk/client-cloudwatch";
import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  UpdateAutoScalingGroupCommand,
  AttachLoadBalancerTargetGroupsCommand,
  PutScalingPolicyCommand,
} from "@aws-sdk/client-auto-scaling";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../utils/aws-profile.js";
import { readAwsResources, writeAwsResources } from "../utils/aws-resources.js";
import { loadPushkinConfig } from "../../../utils/pushkin-config.js";
import {
  alarmCPUHigh,
  alarmRAMHigh,
  alarmRDSWriteLatencyHigh,
  scalingPolicyTargets,
} from "../awsConfigs.js";
import { AWS_REGION } from "../constants.js";

/**
 * Set up CloudWatch alarms, SNS notifications, and an autoscaling policy for a deployed site.
 * @param {string} projectName
 */
export async function createAutoScale(projectName) {
  const shortName = projectName.replace(/[^A-Za-z0-9]/g, "");
  const snsName = shortName.concat("Alarms");
  const factory = new AWSClientFactory(AWS_REGION, getAwsProfile());

  // Load resource identifiers
  let awsResources;
  try {
    awsResources = readAwsResources();
  } catch (e) {
    console.error("Unable to read ECSName from awsResources.js");
    throw e;
  }
  const { ECSName, targetGroupArn, loadBalancerName } = awsResources;

  // Load pushkin config for DB names and notification email
  let config;
  try {
    config = loadPushkinConfig();
  } catch (e) {
    console.error("Couldn't load pushkin.yaml");
    throw e;
  }
  const useEmail = config.info.email;

  // Build per-DB alarm configs from the RDS write latency template
  const alarmMainHigh = {
    ...JSON.parse(JSON.stringify(alarmRDSWriteLatencyHigh)),
    AlarmName: `${shortName}MainWriteLatencyHigh`,
    Dimensions: [
      { Name: "DBInstanceIdentifier", Value: config.databases.production.experiment.database },
    ],
  };
  const alarmTransactionHigh = {
    ...JSON.parse(JSON.stringify(alarmRDSWriteLatencyHigh)),
    AlarmName: `${shortName}TransactionWriteLatencyHigh`,
    Dimensions: [
      { Name: "DBInstanceIdentifier", Value: config.databases.production.transaction.database },
    ],
  };

  // Get load balancer ARN (needed for scaling policy resource label)
  const elb = factory.createClient(ElasticLoadBalancingV2Client);
  let loadBalancerArn;
  try {
    const { LoadBalancers } = await elb.send(
      new DescribeLoadBalancersCommand({ Names: [loadBalancerName] }),
    );
    loadBalancerArn = LoadBalancers[0].LoadBalancerArn;
  } catch (e) {
    console.error("Unable to find load balancer ARN");
    throw e;
  }

  // Create SNS topic and subscribe the project's email address
  console.log("Creating SNS topic");
  const sns = factory.createClient(SNSClient);
  let TopicArn;
  try {
    // CreateTopic is idempotent — returns the existing ARN if the topic already exists
    const { TopicArn: arn } = await sns.send(new CreateTopicCommand({ Name: snsName }));
    TopicArn = arn;
  } catch (e) {
    console.error("Unable to create SNS topic");
    throw e;
  }
  try {
    await sns.send(new SubscribeCommand({ TopicArn, Protocol: "email", Endpoint: useEmail }));
  } catch (e) {
    console.error("Unable to subscribe to SNS topic");
    throw e;
  }

  // Register CloudWatch alarms
  console.log("Registering CloudWatch alarms");
  const cw = factory.createClient(CloudWatchClient);

  const cpuAlarm = {
    ...JSON.parse(JSON.stringify(alarmCPUHigh)),
    AlarmName: `${shortName}alarmCPUHigh`,
    AlarmActions: [TopicArn],
    Dimensions: [{ Name: "ClusterName", Value: ECSName }],
  };
  const ramAlarm = {
    ...JSON.parse(JSON.stringify(alarmRAMHigh)),
    AlarmName: `${shortName}alarmRAMHigh`,
    AlarmActions: [TopicArn],
    Dimensions: [{ Name: "ClusterName", Value: ECSName }],
  };

  await Promise.all([
    cw.send(new PutMetricAlarmCommand({ ...cpuAlarm, AlarmActions: [TopicArn] })),
    cw.send(new PutMetricAlarmCommand({ ...ramAlarm, AlarmActions: [TopicArn] })),
    cw.send(new PutMetricAlarmCommand({ ...alarmMainHigh, AlarmActions: [TopicArn] })),
    cw.send(new PutMetricAlarmCommand({ ...alarmTransactionHigh, AlarmActions: [TopicArn] })),
  ]);

  // Find the autoscaling group for this project
  console.log("Finding autoscaling group");
  const as = factory.createClient(AutoScalingClient);
  let asGroup;
  try {
    const { AutoScalingGroups } = await as.send(new DescribeAutoScalingGroupsCommand({}));
    asGroup = AutoScalingGroups.find((g) =>
      g.AutoScalingGroupName.includes(shortName),
    )?.AutoScalingGroupName;
    if (!asGroup) throw new Error(`No autoscaling group found for project: ${shortName}`);
  } catch (e) {
    console.error("Unable to find autoscaling group");
    throw e;
  }

  // Configure the autoscaling group and attach target group
  try {
    await as.send(
      new UpdateAutoScalingGroupCommand({
        AutoScalingGroupName: asGroup,
        MinSize: 2,
        MaxSize: 10,
        DesiredCapacity: 2,
      }),
    );
    await as.send(
      new AttachLoadBalancerTargetGroupsCommand({
        AutoScalingGroupName: asGroup,
        TargetGroupARNs: [targetGroupArn],
      }),
    );
  } catch (e) {
    console.error("Unable to update autoscaling group settings");
    throw e;
  }

  // Create target-tracking scaling policy
  const label1 = loadBalancerArn.split("loadbalancer/")[1];
  const label2 = "/targetgroup".concat(targetGroupArn.split("targetgroup")[1]);
  const policyConfig = JSON.parse(JSON.stringify(scalingPolicyTargets));
  policyConfig.PredefinedMetricSpecification.ResourceLabel = label1.concat(label2);

  let policyArn, alarmUp, alarmDown;
  try {
    const policyResponse = await as.send(
      new PutScalingPolicyCommand({
        PolicyName: "MyPushkinPolicy",
        AutoScalingGroupName: asGroup,
        PolicyType: "TargetTrackingScaling",
        TargetTrackingConfiguration: policyConfig,
      }),
    );
    alarmUp = policyResponse.Alarms?.[0];
    alarmDown = policyResponse.Alarms?.[1];
    policyArn = policyResponse.PolicyARN;
  } catch (e) {
    console.error("Unable to create autoscaling policy");
    throw e;
  }

  // Save policy info back to awsResources
  console.log("Updating awsResources with autoscaling info");
  try {
    writeAwsResources({ ...awsResources, alarmUp, alarmDown, policyArn });
  } catch (e) {
    console.error("Unable to update awsResources.js");
    throw e;
  }
}
