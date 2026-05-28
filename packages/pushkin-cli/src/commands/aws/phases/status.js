/**
 * AWS Resource Status Service
 * Provides detailed status information for the current Pushkin project's AWS resources
 */

import {
  CloudFrontClient,
  GetDistributionCommand,
  ListDistributionsCommand,
} from "@aws-sdk/client-cloudfront";
import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBSnapshotsCommand,
} from "@aws-sdk/client-rds";
import { ECSClient, DescribeServicesCommand, DescribeClustersCommand } from "@aws-sdk/client-ecs";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { S3Client, HeadBucketCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { EC2Client, DescribeSecurityGroupsCommand } from "@aws-sdk/client-ec2";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { SecretsManagerClient, ListSecretsCommand } from "@aws-sdk/client-secrets-manager";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../utils/aws-profile.js";
import { readAwsResources } from "../utils/aws-resources.js";
import { loadPushkinConfig } from "../../../utils/pushkin-config.js";
import { AWS_REGION } from "../constants.js";

/**
 * Get status of CloudFront distribution
 */
const getCloudFrontStatus = async (distributionId, verbose = false) => {
  try {
    const clientFactory = new AWSClientFactory(AWS_REGION, getAwsProfile());
    const client = clientFactory.createClient(CloudFrontClient);
    const response = await client.send(new GetDistributionCommand({ Id: distributionId }));
    const dist = response.Distribution;

    return {
      status: dist.Status,
      enabled: dist.DistributionConfig.Enabled,
      domainName: dist.DomainName,
      lastModified: dist.LastModifiedTime,
    };
  } catch (error) {
    if (verbose) console.error(`Error getting CloudFront status:`, error);
    return { status: "ERROR", error: error.message };
  }
};

/**
 * Get status of RDS database instances
 */
const getRdsStatus = async (dbNames, verbose = false) => {
  try {
    const clientFactory = new AWSClientFactory(AWS_REGION, getAwsProfile());
    const client = clientFactory.createClient(RDSClient);
    const response = await client.send(new DescribeDBInstancesCommand({}));

    const statuses = {};
    for (const dbName of dbNames) {
      const instance = response.DBInstances.find((db) => db.DBInstanceIdentifier === dbName);
      if (instance) {
        statuses[dbName] = {
          status: instance.DBInstanceStatus,
          engine: instance.Engine,
          engineVersion: instance.EngineVersion,
          instanceClass: instance.DBInstanceClass,
          allocatedStorage: instance.AllocatedStorage,
          endpoint: instance.Endpoint?.Address || "N/A",
        };
      } else {
        statuses[dbName] = { status: "NOT_FOUND" };
      }
    }
    return statuses;
  } catch (error) {
    if (verbose) console.error(`Error getting RDS status:`, error);
    return { error: error.message };
  }
};

/**
 * Get status of ECS cluster and services
 */
const getEcsStatus = async (clusterName, serviceNames, verbose = false) => {
  try {
    const clientFactory = new AWSClientFactory(AWS_REGION, getAwsProfile());
    const client = clientFactory.createClient(ECSClient);

    // Get service statuses
    const servicesResponse = await client.send(
      new DescribeServicesCommand({
        cluster: clusterName,
        services: serviceNames,
      }),
    );

    const serviceStatuses = {};
    for (const service of servicesResponse.services) {
      serviceStatuses[service.serviceName] = {
        status: service.status,
        runningCount: service.runningCount,
        desiredCount: service.desiredCount,
        pendingCount: service.pendingCount,
        launchType: service.launchType,
      };
    }

    return {
      cluster: clusterName,
      services: serviceStatuses,
    };
  } catch (error) {
    if (verbose) console.error(`Error getting ECS status:`, error);
    return { error: error.message };
  }
};

/**
 * Get status of load balancer
 */
const getLoadBalancerStatus = async (loadBalancerName, verbose = false) => {
  try {
    const clientFactory = new AWSClientFactory(AWS_REGION, getAwsProfile());
    const client = clientFactory.createClient(ElasticLoadBalancingV2Client);
    const response = await client.send(
      new DescribeLoadBalancersCommand({ Names: [loadBalancerName] }),
    );

    const lb = response.LoadBalancers[0];
    return {
      state: lb.State.Code,
      dnsName: lb.DNSName,
      scheme: lb.Scheme,
      type: lb.Type,
      availabilityZones: lb.AvailabilityZones.length,
    };
  } catch (error) {
    if (verbose) console.error(`Error getting load balancer status:`, error);
    return { state: "ERROR", error: error.message };
  }
};

/**
 * Get status of S3 bucket
 */
const getS3Status = async (bucketName, verbose = false) => {
  try {
    const clientFactory = new AWSClientFactory(AWS_REGION, getAwsProfile());
    const client = clientFactory.createClient(S3Client);
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return { status: "EXISTS" };
  } catch (error) {
    if (error.name === "NotFound") {
      return { status: "NOT_FOUND" };
    }
    if (verbose) console.error(`Error getting S3 status:`, error);
    return { status: "ERROR", error: error.message };
  }
};

/**
 * Main function to get comprehensive status of all AWS resources for the current project
 * @param {boolean} verbose - Whether to show verbose output
 */
export const getProjectStatus = async (verbose = false) => {
  // TODO: getProjectStatus in packages/pushkin-cli/src/commands/aws/phases/status.js uses hardcoded
  // service names like ${projectName}-api-service but the actual ECS services are named "api",
  // "message-queue", and per-worker names.
  console.log("\n📊 Checking AWS resource status for current project...\n");

  let resources, config;
  try {
    resources = readAwsResources();
    config = loadPushkinConfig();
  } catch (error) {
    console.error("❌ Error reading project configuration:");
    console.error(
      "   Make sure you're in a Pushkin project directory and have run 'pushkin aws init'",
    );
    if (verbose) console.error(error);
    return;
  }

  const projectName = config.info.shortName;
  console.log(`Project: ${projectName}\n`);

  // CloudFront
  if (resources.cloudfront?.distributionId) {
    console.log("☁️  CloudFront Distribution");
    const cfStatus = await getCloudFrontStatus(
      resources.cloudfront.distributionId,
      verbose,
    );
    if (cfStatus.status === "ERROR") {
      console.log(`   Status: ❌ ${cfStatus.error}`);
    } else {
      console.log(`   Status: ${cfStatus.status === "Deployed" ? "✅" : "⏳"} ${cfStatus.status}`);
      console.log(`   Enabled: ${cfStatus.enabled ? "Yes" : "No"}`);
      console.log(`   Domain: ${cfStatus.domainName}`);
      console.log(`   Last Modified: ${cfStatus.lastModified}`);
    }
  }

  // S3 Bucket
  if (resources.s3BucketName) {
    console.log("\n🪣  S3 Bucket");
    const s3Status = await getS3Status(resources.s3BucketName, verbose);
    console.log(`   Name: ${resources.s3BucketName}`);
    console.log(`   Status: ${s3Status.status === "EXISTS" ? "✅" : "❌"} ${s3Status.status}`);
  }

  // RDS Databases
  if (config.databases?.production && typeof config.databases.production === "object") {
    const dbEntries = Object.entries(config.databases.production);
    if (dbEntries.length > 0) {
      const dbNames = dbEntries.map(([, db]) => db.name);
      console.log("\n🗄️  RDS Databases");
      const rdsStatuses = await getRdsStatus(dbNames, verbose);
      if (rdsStatuses.error) {
        console.log(`   Status: ❌ ${rdsStatuses.error}`);
      } else {
        for (const [dbName, status] of Object.entries(rdsStatuses)) {
          console.log(`\n   ${dbName}:`);
          if (status.status === "NOT_FOUND") {
            console.log(`      Status: ❌ NOT_FOUND`);
          } else {
            const statusIcon = status.status === "available" ? "✅" : "⏳";
            console.log(`      Status: ${statusIcon} ${status.status}`);
            console.log(`      Engine: ${status.engine} ${status.engineVersion}`);
            console.log(`      Instance: ${status.instanceClass}`);
            console.log(`      Storage: ${status.allocatedStorage} GB`);
            console.log(`      Endpoint: ${status.endpoint}`);
          }
        }
      }
    }
  }

  // ECS Services
  if (resources.ECSName) {
    console.log("\n🐳  ECS Services");
    const serviceNames = [
      `${projectName}-api-service`,
      `${projectName}-worker-service`,
      `${projectName}-server-service`,
    ];
    const ecsStatus = await getEcsStatus(resources.ECSName, serviceNames, verbose);

    if (ecsStatus.error) {
      console.log(`   Status: ❌ ${ecsStatus.error}`);
    } else {
      console.log(`   Cluster: ${ecsStatus.cluster}`);
      for (const [serviceName, status] of Object.entries(ecsStatus.services)) {
        const statusIcon = status.runningCount === status.desiredCount ? "✅" : "⏳";
        console.log(`\n   ${serviceName}:`);
        console.log(`      Status: ${statusIcon} ${status.status}`);
        console.log(
          `      Tasks: ${status.runningCount}/${status.desiredCount} running (${status.pendingCount} pending)`,
        );
        console.log(`      Launch Type: ${status.launchType}`);
      }
    }
  }

  // Load Balancer
  if (resources.loadBalancerName) {
    console.log("\n⚖️  Load Balancer");
    const lbStatus = await getLoadBalancerStatus(
      resources.loadBalancerName,
      verbose,
    );
    if (lbStatus.state === "ERROR") {
      console.log(`   Status: ❌ ${lbStatus.error}`);
    } else {
      console.log(`   Name: ${resources.loadBalancerName}`);
      console.log(`   State: ${lbStatus.state === "active" ? "✅" : "⏳"} ${lbStatus.state}`);
      console.log(`   DNS: ${lbStatus.dnsName}`);
      console.log(`   Type: ${lbStatus.type} (${lbStatus.scheme})`);
      console.log(`   Availability Zones: ${lbStatus.availabilityZones}`);
    }
  }

  console.log("\n✅ Status check complete!\n");
};

/**
 * List all AWS resources across the account (diagnostic tool, no project filtering).
 * Used after armageddon to confirm nothing billable was left running.
 */
export async function listAllResources() {
  const factory = new AWSClientFactory(AWS_REGION, getAwsProfile());
  const rds = factory.createClient(RDSClient);
  const ecs = factory.createClient(ECSClient);
  const ec2 = factory.createClient(EC2Client);
  const elb = factory.createClient(ElasticLoadBalancingV2Client);
  const s3 = factory.createClient(S3Client);
  const cf = factory.createClient(CloudFrontClient);
  const cfn = factory.createClient(CloudFormationClient);
  const sm = factory.createClient(SecretsManagerClient);

  const { DBInstances } = await rds.send(new DescribeDBInstancesCommand({}));
  if (DBInstances?.length > 0) console.log("DB Instances:\n", DBInstances);

  const { clusters } = await ecs.send(new DescribeClustersCommand({}));
  if (clusters?.length > 0) console.log("ECS Clusters:\n", clusters);

  const { SecurityGroups } = await ec2.send(new DescribeSecurityGroupsCommand({}));
  SecurityGroups?.filter((g) => g.GroupName !== "default").forEach((g) =>
    console.log("Security Group:\n", g),
  );

  const { LoadBalancers } = await elb.send(new DescribeLoadBalancersCommand({}));
  if (LoadBalancers?.length > 0) console.log("Load Balancers:\n", LoadBalancers);

  const { Buckets } = await s3.send(new ListBucketsCommand({}));
  if (Buckets?.length > 0) console.log("S3 Buckets:\n", Buckets);

  const { DistributionList } = await cf.send(new ListDistributionsCommand({}));
  if (DistributionList?.Items?.length > 0)
    console.log("CloudFront Distributions:\n", DistributionList);

  const { Stacks } = await cfn.send(new DescribeStacksCommand({}));
  if (Stacks?.length > 0) console.log("CloudFormation Stacks:\n", Stacks);

  const { DBSnapshots } = await rds.send(new DescribeDBSnapshotsCommand({}));
  if (DBSnapshots?.length > 0) console.log("DB Snapshots:\n", DBSnapshots);

  const { SecretList } = await sm.send(new ListSecretsCommand({}));
  if (SecretList?.length > 0) console.log("Secrets:\n", SecretList);
}
