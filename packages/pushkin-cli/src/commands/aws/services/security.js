import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  EC2Client,
  CreateSecurityGroupCommand,
  AuthorizeSecurityGroupIngressCommand,
  DescribeSecurityGroupsCommand,
  DeleteSecurityGroupCommand,
} from "@aws-sdk/client-ec2";
import { WAFv2Client, ListWebACLsCommand, CreateWebACLCommand } from "@aws-sdk/client-wafv2";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { AWS_REGION } from "../constants.js";
import { pushkinACL } from "../awsConfigs.js";

const PROJECT_TAG_KEY = loadAwsConfig().tagging.projectTagKey;

/**
 * (Helper)
 * Creates an EC2 client using the same region and IAM profile
 */
const createEC2Client = (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  return factory.createClient(EC2Client);
};

/**
 * (Helper)
 * Creates a WAFv2 client using the same region and IAM profile
 */
const createWAFv2Client = (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  return factory.createClient(WAFv2Client);
};

/**
 * Check if the IAM user is configured on the AWS SDK
 * @param {string} useIAM - The IAM user to check
 * @returns {Promise<void>} - Resolves if the IAM user is configured, rejects with error if not
 */
const checkIAMUser = async (useIAM) => {
  const factory = new AWSClientFactory(AWS_REGION, useIAM);
  const sts = factory.createClient(STSClient);

  try {
    await sts.send(new GetCallerIdentityCommand({}));
  } catch (error) {
    console.error(
      `The IAM user ${useIAM} is not configured on the AWS SDK: ${error.message}\nFor more information see https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/iam-examples.html`,
    );
    throw error;
  }
};

/**
 * (Helper)
 * Create security group for database access
 * WHY: RDS instances need a security group with PostgreSQL port (5432) open for incoming connections
 * @param {string} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<string>} - The security group ID for the database group
 */
const createDatabaseSecurityGroup = async (useIAM, projName) => {
  const ec2Client = createEC2Client(useIAM);

  try {
    const createSGResponse = await ec2Client.send(
      new CreateSecurityGroupCommand({
        GroupName: "DatabaseGroup",
        Description: "For connecting to databases",
        TagSpecifications: [
          {
            ResourceType: "security-group",
            Tags: [{ Key: PROJECT_TAG_KEY, Value: projName }],
          },
        ],
      }),
    );

    const groupId = createSGResponse.GroupId;

    // Configure inbound rules to allow PostgreSQL connections from anywhere
    await ec2Client.send(
      new AuthorizeSecurityGroupIngressCommand({
        GroupName: "DatabaseGroup",
        IpPermissions: [
          {
            IpProtocol: "tcp",
            FromPort: 5432,
            ToPort: 5432,
            Ipv6Ranges: [{ CidrIpv6: "::/0" }],
            IpRanges: [{ CidrIp: "0.0.0.0/0" }],
            // TODO: This means anywhere on the internet, quite permissive; more restrictive rules include VPC-only
          },
        ],
      }),
    );

    return groupId;
  } catch (error) {
    console.error(`Failed to create security group for databases: ${error.message}`);
    throw error;
  }
};

/**
 * Ensures a DatabaseGroup security group exists before creating databases
 * @param {string} useIAM - The IAM role to use
 * @param {string} projName - The project name
 * @returns {Promise<string>} - The security group ID for the database group
 */
const checkDatabaseSecurityGroup = async (useIAM, projName) => {
  const ec2Client = createEC2Client(useIAM); // Not actually running EC2 instances anymore, just using the API to manage VPC security groups

  let securityGroups;

  // Fetch all security groups
  try {
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    securityGroups = describeSecurityGroupsResponse.SecurityGroups || [];
  } catch (error) {
    console.error(`Failed to retrieve list of security groups from AWS: ${error.message}`);
    throw error;
  }

  // Check if DatabaseGroup already exists
  const foundDBGroup = securityGroups.find((g) => g.GroupName === "DatabaseGroup");

  if (foundDBGroup) {
    console.log(`Database security group already exists. Skipping creation.`);
    return foundDBGroup.GroupId;
  } else {
    console.log("Creating security group for databases...");
    return await createDatabaseSecurityGroup(useIAM, projName);
  }
};

/**
 * (Helper)
 * Find an existing WAF Web ACL named for CloudFront distributions before creating new one
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise<string|undefined>} - The ACL ARN if found, undefined otherwise
 */
const findACL = async (useIAM) => {
  const wafv2Client = createWAFv2Client(useIAM);

  try {
    const listWebACLsResponse = await wafv2Client.send(
      new ListWebACLsCommand({ Scope: "CLOUDFRONT" }),
    );
    const webACLs = listWebACLsResponse.WebACLs || [];

    const foundACL = webACLs.find((acl) => acl.Name === pushkinACL.Name);
    return foundACL?.ARN;
  } catch (error) {
    console.error(`Unable to get list of ACLs: ${error.message}`);
    throw error;
  }
};

/**
 * Retrieve WAF Web ACL for CloudFront protection or create if it doesn't exist
 * WHY: CloudFront distributions need a Web ACL to protect against common web exploits
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose – Whether to log details about getting WAF Web ACL
 * @returns {Promise<string>} - The ACL ARN
 */
const getACL = async (useIAM, verbose = false) => {
  // Check if ACL already exists
  let ACLarn = await findACL(useIAM);

  if (!ACLarn) {
    // Create new ACL
    const wafv2Client = createWAFv2Client(useIAM);

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
      console.error(`Unable to create ACL: ${error.message}`);
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
 * (Helper)
 * Delete a single security group
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
    console.warn(error.message);
  }

  return true;
};

/**
 * Delete security groups
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
    console.error(`Unable to list security groups: ${error.message}`);
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
export { checkIAMUser, checkDatabaseSecurityGroup, getACL, deleteSecurityGroups };
