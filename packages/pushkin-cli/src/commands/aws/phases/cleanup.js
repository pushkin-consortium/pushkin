/**
 * Cleanup Phase
 * Handles deletion of all AWS resources (armageddon command)
 * @module aws/phases/cleanup
 */

import { deleteCluster } from "../services/ecs/clusters.js";
import { deleteServiceDiscovery } from "../services/ecs/discovery.js";
import { getDbsToDelete, deleteDbs } from "../services/rds.js";
import { deleteLoadBalancer, deleteTargetGroups } from "../services/elb.js";
import { deleteCloudFrontDistribution, deleteOacs } from "../services/cloudfront.js";
import { deleteResourceRecords } from "../services/route53.js";
import { deleteS3Buckets } from "../services/s3.js";
import { deleteSecurityGroups } from "../services/security.js";
import { readAwsResources, writeAwsResources } from "../utils/aws-resources.js";

/**
 * Delete all AWS resources in proper dependency order
 * @param {string} profileName - AWS profile name
 * @param {string} killType - 'kill' to delete project resources only, 'armageddon' to delete all
 * @returns {Promise<void>}
 */
export async function cleanupResources(profileName, killType) {
  console.log("Starting AWS resource cleanup...");

  // Load project information
  let awsResources;
  try {
    awsResources = readAwsResources();
  } catch (e) {
    console.error(`Unable to load awsResources.js`);
  }

  let projectName;
  if (awsResources) {
    projectName = awsResources.name; // can use this to identify resources needing deletion
  } else {
    if (killType === "kill") {
      console.warn(
        `Unable to find awsResources.js. You won't be able to run kill.\n Either delete AWS deploy manually or run aws armageddon to delete everything including things not related to your project.`,
      );
    }
  }

  const killTag = killType === "kill" ? projectName : false;

  // Start deletions in dependency order
  const deletedCluster = deleteCluster(profileName, killTag, projectName, awsResources);
  const deletedServiceDiscovery = deleteServiceDiscovery(profileName, projectName, killTag);

  const dbsToDelete = getDbsToDelete(profileName, killTag, awsResources);
  const deletedDbs = deleteDbs(dbsToDelete, profileName, killTag);

  const deletedLoadBalancer = deleteLoadBalancer(profileName, killTag);

  // Delete CloudFront first, then OACs (CloudFront must be deleted before OACs can be deleted)
  const deletedCloudFront = deleteCloudFrontDistribution(profileName, projectName, killTag);

  let deletedOacs;
  try {
    deletedOacs = deleteOacs(profileName, deletedCloudFront, killTag);
  } catch (error) {
    console.warn(`Unable to delete origin access controls:`, error); // Don't fail the whole process for this
  }

  const deletedResourceRecords = deleteResourceRecords(profileName, killTag, projectName);

  const deletedTargetGroup = deleteTargetGroups(profileName, deletedLoadBalancer);

  const deletedBucket = deleteS3Buckets(profileName, killTag, awsResources, deletedCloudFront);

  const deletedGroups = deleteSecurityGroups(profileName, killTag, deletedDbs);

  // Update awsResources.js to reflect deletions
  console.log(`Updating awsResources.js`);
  let awsResourcesNull = {
    name: projectName,
    s3BucketName: null,
    iam: profileName,
    dbs: [],
    cloudFrontId: null,
    ECSName: null,
    OAC: null,
  };

  try {
    writeAwsResources(awsResourcesNull);
  } catch (e) {
    console.error(`Unable to update awsResources.js`);
    console.error(e);
  }

  // Wait for all deletions to complete
  await Promise.all([
    deletedGroups,
    deletedResourceRecords,
    deletedBucket,
    deletedCloudFront,
    deletedDbs,
    deletedLoadBalancer,
    deletedOacs,
    deletedCluster,
    deletedTargetGroup,
    deletedServiceDiscovery,
  ]);

  console.log("✅ Cleanup complete!");
}
