/**
 * AWS Security Service Management
 * Handles security groups, IAM verification, and WAF Web ACLs
 * @module security
 */

import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  EC2Client,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
  DeleteSecurityGroupCommand,
} from "@aws-sdk/client-ec2";
import { WAFV2Client, ListWebACLsCommand, CreateWebACLCommand } from "@aws-sdk/client-wafv2";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { AWS_REGION } from "../constants.js";
import { pushkinACL } from "../awsConfigs.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * Creates an EC2 client using the same region and IAM profile.
 */
const createEC2Client = (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  return factory.createClient(EC2Client);
};

/**
 * Creates a WAFv2 client using the same region and IAM profile.
 */
const createWAFv2Client = (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  return factory.createClient(WAFV2Client);
};

/**
 * Check if the IAM user is configured on the AWS SDK.
 * WHY: Check if the AWS SDK uses the provided IAM user to make API calls to AWS.
 * @param {string} useIAM - The IAM user to check
 * @returns {Promise<void>} - Resolves if the IAM user is configured, rejects with error if not
 */
const verifyIAMCredentials = async (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const sts = factory.createClient(STSClient);

  try {
    await sts.send(new GetCallerIdentityCommand({}));
  } catch (error) {
    console.error(
      `The IAM user ${useIAM} is not configured on the AWS SDK: ${error}\nFor more information see https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html`,
    );
    throw error;
  }
};

/**
 * Ensure a named security group exists, creating it with the given ingress rules if not.
 * WHY: All three Pushkin security groups (database, balancer, ECS) share the same
 * create-if-missing pattern and differ only in name, description, and port rules.
 * @param {string} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @param {string} groupSuffix - Appended to projName to form the group name
 * @param {string} description - Security group description
 * @param {Array} ipPermissions - Ingress rules passed to AuthorizeSecurityGroupIngress
 * @returns {Promise<string>} - The security group ID
 */
const ensureSecurityGroup = async (useIAM, projName, groupSuffix, description, ipPermissions) => {
  const ec2Client = createEC2Client(useIAM);
  const groupName = `${projName}-${groupSuffix}`;

  let securityGroups;
  try {
    const response = await ec2Client.send(new DescribeSecurityGroupsCommand({}));
    securityGroups = response.SecurityGroups || [];
  } catch (error) {
    console.error(`Failed to retrieve list of security groups from AWS:`, error);
    throw error;
  }

  const foundGroup = securityGroups.find((g) => g.GroupName === groupName);
  if (foundGroup) {
    console.log(`Security group ${groupName} already exists. Skipping creation.`);
    return foundGroup.GroupId;
  }

  console.log(`Creating security group ${groupName}...`);
  try {
    const createSGResponse = await ec2Client.send(
      new CreateSecurityGroupCommand({
        GroupName: groupName,
        Description: description,
        TagSpecifications: [
          { ResourceType: "security-group", Tags: [{ Key: PROJECT_TAG_KEY, Value: projName }] },
        ],
      }),
    );
    const groupId = createSGResponse.GroupId;
    await ec2Client.send(
      new AuthorizeSecurityGroupIngressCommand({ GroupId: groupId, IpPermissions: ipPermissions }),
    );
    return groupId;
  } catch (error) {
    console.error(`Failed to create security group ${groupName}:`, error);
    throw error;
  }
};

const OPEN_IPV4 = { CidrIp: "0.0.0.0/0" };
const OPEN_IPV6 = { CidrIpv6: "::/0" };

/**
 * Ensure project-specific database security group exists (creates if missing).
 * WHY: Each project needs its own database security group for network isolation between projects.
 * NOTE: Allows PostgreSQL (5432) from anywhere — quite permissive; VPC-only would be more restrictive.
 * @param {string} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<string>} - The security group ID
 */
const ensureDatabaseSecurityGroup = (useIAM, projName) =>
  ensureSecurityGroup(
    useIAM,
    projName,
    "DatabaseGroup",
    `Database security group for ${projName}`,
    [
      {
        IpProtocol: "tcp",
        FromPort: 5432,
        ToPort: 5432,
        IpRanges: [OPEN_IPV4],
        Ipv6Ranges: [OPEN_IPV6],
      },
    ],
  );

/**
 * Ensure project-specific load balancer security group exists (creates if missing).
 * WHY: Each project needs its own load balancer security group for network isolation.
 * @param {string} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<string>} - The security group ID
 */
const ensureBalancerSecurityGroup = (useIAM, projName) =>
  ensureSecurityGroup(
    useIAM,
    projName,
    "BalancerGroup",
    `Load balancer security group for ${projName}`,
    [
      {
        IpProtocol: "tcp",
        FromPort: 80,
        ToPort: 80,
        IpRanges: [OPEN_IPV4],
        Ipv6Ranges: [OPEN_IPV6],
      },
      {
        IpProtocol: "tcp",
        FromPort: 443,
        ToPort: 443,
        IpRanges: [OPEN_IPV4],
        Ipv6Ranges: [OPEN_IPV6],
      },
    ],
  );

/**
 * Ensure project-specific ECS security group exists (creates if missing).
 * WHY: Each project needs its own ECS security group for network isolation.
 * @param {string} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<string>} - The security group ID
 */
const ensureECSSecurityGroup = (useIAM, projName) =>
  ensureSecurityGroup(useIAM, projName, "ECSGroup", `ECS cluster security group for ${projName}`, [
    { IpProtocol: "tcp", FromPort: 80, ToPort: 80, IpRanges: [OPEN_IPV4], Ipv6Ranges: [OPEN_IPV6] },
    { IpProtocol: "tcp", FromPort: 22, ToPort: 22, IpRanges: [OPEN_IPV4], Ipv6Ranges: [OPEN_IPV6] },
    {
      IpProtocol: "tcp",
      FromPort: 1024,
      ToPort: 65535,
      IpRanges: [OPEN_IPV4],
      Ipv6Ranges: [OPEN_IPV6],
    },
  ]);

/**
 * Retrieve WAF Web ACL for CloudFront protection or create if it doesn't exist.
 * WHY: CloudFront distributions need a Web ACL to protect against common web exploits.
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose – Whether to log details about getting WAF Web ACL
 * @returns {Promise<string>} - The ACL ARN
 */
const getACL = async (useIAM, verbose = false) => {
  const wafv2Client = createWAFv2Client(useIAM);
  let ACLarn;
  // Check if ACL already exists
  try {
    const listWebACLsResponse = await wafv2Client.send(
      new ListWebACLsCommand({ Scope: "CLOUDFRONT" }),
    );
    const webACLs = listWebACLsResponse.WebACLs || [];

    const foundACL = webACLs.find((acl) => acl.Name === pushkinACL.Name);
    ACLarn = foundACL?.ARN;
  } catch (error) {
    console.error(`Unable to get list of ACLs:`, error);
    throw error;
  }

  if (!ACLarn) {
    // Create new ACL
    try {
      const createWebACLResponse = await wafv2Client.send(
        new CreateWebACLCommand({
          Name: pushkinACL.Name,
          Scope: pushkinACL.Scope,
          DefaultAction: pushkinACL.DefaultAction,
          Rules: pushkinACL.Rules,
          VisibilityConfig: pushkinACL.VisibilityConfig,
        }),
      );
      ACLarn = createWebACLResponse.Summary.ARN;
      if (verbose) {
        console.log(`Created new ${pushkinACL.Name} Web ACL`);
      }
    } catch (error) {
      console.error(`Unable to create ACL:`, error);
      throw error;
    }
  } else {
    if (verbose) {
      console.log(`Using existing ${pushkinACL.Name} Web ACL`);
    }
  }

  return ACLarn;
};

/**
 * Delete a single security group.
 * WHY: Security groups must be deleted individually, with proper error handling for dependencies.
 * @param {string} groupName - The security group name to delete
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<boolean>} - Returns true when complete (even if deletion failed)
 */
const deleteSingleSecurityGroup = async (groupName, useIAM, verbose = false) => {
  if (verbose) {
    console.log(`Deleting security group ${groupName}`);
  }
  const ec2Client = createEC2Client(useIAM);

  // Check if group exists
  try {
    await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupNames: [groupName] }));
  } catch (error) {
    console.log(`Security group ${groupName} not found: ${error.message}`);
    return true;
  }

  // Try to delete the group
  try {
    await ec2Client.send(new DeleteSecurityGroupCommand({ GroupName: groupName }));
    if (verbose) {
      console.log(`Successfully deleted security group ${groupName}`);
    }
  } catch (error) {
    console.warn(
      // TODO: killize
      `Unable to delete security group ${groupName}. This is usually because AWS needs something else deleted first (e.g., RDS database instances).\nWe recommend you retry 'pushkin aws kill' or 'pushkin aws armageddon' in a few minutes.`,
    );
    console.warn(error);
  }

  return true;
};

/**
 * Delete security groups.
 * WHY: Security groups must be deleted as part of teardown, but only after dependent resources (like RDS) are deleted.
 * @param {string} useIAM - The IAM profile to use
 * @param {string|boolean} killTag - If string (project name), only delete project groups; if false, delete all (except default)
 * @param {Promise} deletedDBs - Promise that resolves when databases are deleted
 * @returns {Promise<boolean[]>} - Array of deletion results
 */
const deleteSecurityGroups = async (useIAM, killTag, deletedDBs) => {
  console.log(`Waiting for databases to be deleted before removing security groups...`);
  await deletedDBs;
  console.log(`Databases deleted. Starting security group deletion.`);

  const ec2Client = createEC2Client(useIAM);

  let securityGroups;
  try {
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    securityGroups = describeSecurityGroupsResponse.SecurityGroups || [];
  } catch (error) {
    console.error(`Unable to list security groups:`, error);
    throw error;
  }

  // Filter security groups based on killTag
  const groupsToDelete = [];
  for (const group of securityGroups) {
    // Skip the default security group (can't be deleted)
    if (group.GroupName === "default") {
      continue;
    }

    // TODO: killize
    if (!killTag) {
      // Armageddon mode: delete all non-default groups
      groupsToDelete.push(group.GroupName);
    } else {
      // Kill mode: delete only groups tagged with the project name
      const hasProjectTag = group.Tags?.some(
        (tag) => tag.Key === PROJECT_TAG_KEY && tag.Value === killTag,
      );
      if (hasProjectTag) {
        groupsToDelete.push(group.GroupName);
      }
    }
  }

  if (groupsToDelete.length === 0) {
    console.log(`No security groups to delete.`);
    return [];
  }

  console.log(`Deleting ${groupsToDelete.length} security group(s)...`);
  return Promise.all(groupsToDelete.map((g) => deleteSingleSecurityGroup(g, useIAM)));
};

// Export functions
export {
  verifyIAMCredentials,
  ensureDatabaseSecurityGroup,
  ensureBalancerSecurityGroup,
  ensureECSSecurityGroup,
  getACL,
  deleteSecurityGroups,
};
