/**
 * Cleanup Phase
 * Handles deletion of all AWS resources (armageddon command)
 * @module aws/phases/cleanup
 */

import { deleteCluster } from '../services/ecs/clusters.js';
import { getDBsToDelete, deleteDBs } from '../services/rds.js';
import { deleteLoadBalancer, deleteTargetGroups } from '../services/elb.js';
import { deleteCloudFront, deleteOACs } from '../services/cloudfront.js';
import { deleteResourceRecords } from '../services/route53.js';
import { deleteS3Buckets } from '../services/s3.js';
import { deleteSecurityGroups } from '../services/security.js';
import { readAwsResources, writeAwsResources } from '../utils/aws-resources.js';

/**
 * Delete all AWS resources in proper dependency order
 * @param {string} profileName - AWS profile name
 * @param {string} killType - 'kill' to delete project resources only, 'armageddon' to delete all
 * @returns {Promise<void>}
 */
export async function cleanupResources(profileName, killType) {
  console.log('Starting AWS resource cleanup...');

  // Load project information
  let awsResources;
  try {
    awsResources = readAwsResources();
  } catch (e) {
    console.error(`Unable to load awsResources.js`);
  }

  let projName;
  if (awsResources) {
    projName = awsResources.name; // can use this to identify resources needing deletion
  } else {
    if (killType === 'kill') {
      console.warn(
        '\x1b[31m%s\x1b[0m',
        `Unable to find awsResources.js. You won't be able to run kill.\n Either delete AWS deploy manually or run aws armageddon to delete everything including things not related to your project.`
      );
    }
  }

  const killTag = killType === 'kill' ? projName : false;

  // Start deletions in dependency order
  const deletedCluster = deleteCluster(profileName, killTag, projName, awsResources);

  const dbsToDelete = getDBsToDelete(profileName, killTag, awsResources);
  const deletedDBs = deleteDBs(dbsToDelete, profileName, killTag);

  const deletedLoadBalancer = deleteLoadBalancer(profileName, killTag);

  // Delete CloudFront first, then OACs (CloudFront must be deleted before OACs can be deleted)
  const deletedCloudFront = deleteCloudFront(profileName, projName, killTag);

  let deletedOACs;
  try {
    deletedOACs = deleteOACs(profileName, deletedCloudFront, killTag);
  } catch (e) {
    console.warn('\x1b[31m%s\x1b[0m', `Unable to delete origin access controls`);
    console.warn('\x1b[31m%s\x1b[0m', e); // Don't fail the whole process for this
  }

  const deletedResourceRecords = deleteResourceRecords(profileName, killTag, projName);

  const deletedTargetGroup = deleteTargetGroups(profileName, deletedLoadBalancer);

  const deletedBucket = deleteS3Buckets(profileName, killTag, awsResources, deletedCloudFront);

  const deletedGroups = deleteSecurityGroups(profileName, killTag, deletedDBs);

  // Update awsResources.js to reflect deletions
  console.log(`Updating awsResources.js`);
  let awsResourcesNull = {
    name: projName,
    s3BucketName: null,
    iam: profileName,
    dbs: [],
    cloudFrontId: null,
    ECSName: null,
    OAC: null,
  };

  // Remove undefined properties
  Object.keys(awsResourcesNull).forEach((key) => {
    if (awsResourcesNull[key] === undefined) {
      delete awsResourcesNull[key];
    }
  });

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
    deletedDBs,
    deletedLoadBalancer,
    deletedOACs,
    deletedCluster,
    deletedTargetGroup,
  ]);

  console.log('✅ Cleanup complete!');
}
