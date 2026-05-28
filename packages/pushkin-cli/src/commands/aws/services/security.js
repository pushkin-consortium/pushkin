/**
 * Handles security groups, IAM role creation, verification and management, and WAF Web ACLs
 * @module aws/services/security
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
import { ACMClient, ListCertificatesCommand } from "@aws-sdk/client-acm";
import {
  IAMClient,
  GetRoleCommand,
  CreateRoleCommand,
  AttachRolePolicyCommand,
} from "@aws-sdk/client-iam";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION, PROJECT_TAG_KEY } from "../constants.js";
import { pushkinACL } from "../awsConfigs.js";
const OPEN_IPV4 = { CidrIp: "0.0.0.0/0" };
const OPEN_IPV6 = { CidrIpv6: "::/0" };

function createEC2Client(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(EC2Client);
}

// WAFv2 CloudFront-scoped resources must always be managed in us-east-1, regardless of deployment region.
function createWAFv2Client(awsProfileName) {
  return new AWSClientFactory("us-east-1", awsProfileName).createClient(WAFV2Client);
}

function createACMClient(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(ACMClient);
}

function createIAMClient(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(IAMClient);
}

function createSTSClient(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(STSClient);
}

/**
 * List SSL certificates available in ACM, returned as a display-label → ARN map.
 * WHY: This is useful for selecting a certificate when configuring services that require SSL/TLS,
 * such as load balancers or API gateways.
 * @param {string} awsProfileName - The IAM role to use
 * @returns {Promise<Record<string, string>>} Map of display label to certificate ARN
 */
async function listCertificates(awsProfileName) {
  const acm = createACMClient(awsProfileName);
  try {
    const response = await acm.send(new ListCertificatesCommand({}));
    return (response.CertificateSummaryList ?? []).reduce((acc, c) => {
      acc[`${c.DomainName} (Status: ${c.Status}) - ${c.CertificateArn.slice(-8)}`] =
        c.CertificateArn;
      return acc;
    }, {});
  } catch (error) {
    console.error(`Unable to get list of SSL certificates:`, error);
    throw error;
  }
}

/**
 * Ensure the ECS task execution IAM role exists, creating it if necessary.
 * WHY: Fargate tasks need this role to pull container images from ECR and write logs to
 * CloudWatch. Without it, task registration succeeds but tasks fail to start.
 * @param {string} awsProfileName - IAM profile name
 * @param {boolean} verbose - Whether to log details
 * @returns {Promise<string>} ARN of the execution role
 */
async function ensureEcsTaskExecutionRole(awsProfileName, verbose = false) {
  const iamClient = createIAMClient(awsProfileName);
  const roleName = "ecsTaskExecutionRole";

  try {
    const roleResponse = await iamClient.send(new GetRoleCommand({ RoleName: roleName }));
    if (verbose) console.log(`ECS Task Execution Role already exists: ${roleResponse.Role.Arn}`);
    return roleResponse.Role.Arn;
  } catch (error) {
    if (error.name === "NoSuchEntityException") {
      if (verbose) console.log(`Creating ECS Task Execution Role: ${roleName}`);

      const assumeRolePolicyDocument = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "ecs-tasks.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      };

      let roleArn;
      try {
        const createRoleResponse = await iamClient.send(
          new CreateRoleCommand({
            RoleName: roleName,
            AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicyDocument),
            Description: "Allows ECS tasks to call AWS services on user's behalf",
          }),
        );
        roleArn = createRoleResponse.Role.Arn;
      } catch (createError) {
        console.error(`Unable to create ECS Task Execution Role:`, createError);
        throw createError;
      }

      try {
        await iamClient.send(
          new AttachRolePolicyCommand({
            RoleName: roleName,
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
          }),
        );
      } catch (attachError) {
        console.error(
          `Created role ${roleName} but failed to attach execution policy. The role exists but tasks may not start.`,
          attachError,
        );
        throw attachError;
      }

      console.log(`Created and configured ECS Task Execution Role: ${roleArn}`);
      return roleArn;
    } else {
      console.error(`Error checking for ECS Task Execution Role:`, error);
      throw error;
    }
  }
}

/**
 * Check if the IAM user is configured on the AWS SDK.
 * WHY: Check if the AWS SDK uses the provided IAM user to make API calls to AWS.
 * @param {string} awsProfileName - The IAM user to check
 * @returns {Promise<void>} - Resolves if the IAM user is configured, rejects with error if not
 */
async function verifyawsProfileName(awsProfileName) {
  const sts = createSTSClient(awsProfileName);

  try {
    await sts.send(new GetCallerIdentityCommand({}));
  } catch (error) {
    console.error(
      `The IAM user ${awsProfileName} is not configured on the AWS SDK: ${error}\nFor more information see https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html`,
    );
    throw error;
  }
}

/**
 * Ensure a named security group exists, creating it with the given ingress rules if not.
 * WHY: All three Pushkin security groups (database, balancer, ECS) share the same
 * create-if-missing pattern and differ only in name, description, and port rules.
 * @param {string} awsProfileName - The IAM role to use
 * @param {string} projectName - The project name
 * @param {string} groupSuffix - Appended to projectName to form the group name
 * @param {string} description - Security group description
 * @param {Array} ipPermissions - Ingress rules passed to AuthorizeSecurityGroupIngress
 * @returns {Promise<string>} - The security group ID
 */
async function ensureSecurityGroup(
  awsProfileName,
  projectName,
  groupSuffix,
  description,
  ipPermissions,
) {
  const ec2Client = createEC2Client(awsProfileName);
  const groupName = `${projectName}-${groupSuffix}`;

  let securityGroups;
  try {
    const response = await ec2Client.send(
      new DescribeSecurityGroupsCommand({
        Filters: [{ Name: "group-name", Values: [groupName] }],
      }),
    );
    securityGroups = response.SecurityGroups ?? [];
  } catch (error) {
    console.error(`Failed to retrieve security group ${groupName} from AWS:`, error);
    throw error;
  }

  const foundGroup = securityGroups[0];
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
          { ResourceType: "security-group", Tags: [{ Key: PROJECT_TAG_KEY, Value: projectName }] },
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
}

/**
 * Ensure project-specific database security group exists (creates if missing).
 * WHY: Each project needs its own database security group for network isolation between projects.
 * NOTE: Allows PostgreSQL (5432) from anywhere — quite permissive; VPC-only would be more restrictive.
 * @param {string} awsProfileName - The IAM role to use
 * @param {string} projectName - The project name
 * @returns {Promise<string>} - The security group ID
 */
async function ensureDatabaseSecurityGroup(awsProfileName, projectName) {
  return ensureSecurityGroup(
    awsProfileName,
    projectName,
    "DatabaseGroup",
    `Database security group for ${projectName}`,
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
}

/**
 * Ensure project-specific load balancer security group exists (creates if missing).
 * WHY: Each project needs its own load balancer security group for network isolation.
 * @param {string} awsProfileName - The IAM role to use
 * @param {string} projectName - The project name
 * @returns {Promise<string>} - The security group ID
 */
async function ensureBalancerSecurityGroup(awsProfileName, projectName) {
  return ensureSecurityGroup(
    awsProfileName,
    projectName,
    "BalancerGroup",
    `Load balancer security group for ${projectName}`,
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
}
/**
 * Ensure project-specific ECS security group exists (creates if missing).
 * WHY: Each project needs its own ECS security group for network isolation.
 * @param {string} awsProfileName - The IAM role to use
 * @param {string} projectName - The project name
 * @returns {Promise<string>} - The security group ID
 */
async function ensureEcsSecurityGroup(awsProfileName, projectName) {
  return ensureSecurityGroup(
    awsProfileName,
    projectName,
    "ECSGroup",
    `ECS cluster security group for ${projectName}`,
    [
      {
        IpProtocol: "tcp",
        FromPort: 80,
        ToPort: 80,
        IpRanges: [OPEN_IPV4],
        Ipv6Ranges: [OPEN_IPV6],
      },
      // NOTE: SSH (22) is open to the world — permissive, but useful for ECS Exec debugging. Consider restricting to a known IP range.
      {
        IpProtocol: "tcp",
        FromPort: 22,
        ToPort: 22,
        IpRanges: [OPEN_IPV4],
        Ipv6Ranges: [OPEN_IPV6],
      },
      {
        IpProtocol: "tcp",
        FromPort: 1024,
        ToPort: 65535,
        IpRanges: [OPEN_IPV4],
        Ipv6Ranges: [OPEN_IPV6],
      },
    ],
  );
}

/**
 * Retrieve WAF Web ACL for CloudFront protection or create if it doesn't exist.
 * WHY: CloudFront distributions need a Web ACL to protect against common web exploits.
 * @param {string} awsProfileName - The IAM profile to use
 * @param {boolean} verbose – Whether to log details about getting WAF Web ACL
 * @returns {Promise<string>} - The ACL ARN
 */
async function getAcl(awsProfileName, verbose = false) {
  const wafv2Client = createWAFv2Client(awsProfileName);
  let aclArn;
  // Check if ACL already exists
  try {
    const listWebACLsResponse = await wafv2Client.send(
      new ListWebACLsCommand({ Scope: "CLOUDFRONT" }),
    );
    const webAcls = listWebACLsResponse.WebACLs ?? [];

    const foundAcl = webAcls.find((acl) => acl.Name === pushkinACL.Name);
    aclArn = foundAcl?.ARN;
  } catch (error) {
    console.error(`Unable to get list of ACLs:`, error);
    throw error;
  }

  if (!aclArn) {
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
      aclArn = createWebACLResponse.Summary.ARN;
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

  return aclArn;
}

/**
 * Delete a single security group.
 * WHY: Security groups must be deleted individually, with proper error handling for dependencies.
 * @param {string} groupName - The security group name to delete
 * @param {string} awsProfileName - The IAM profile to use
 * @param {boolean} verbose - Whether to log details
 * @returns {Promise<boolean>} - Returns true when complete (even if deletion failed)
 */
async function deleteSingleSecurityGroup(groupName, awsProfileName, verbose = false) {
  if (verbose) {
    console.log(`Deleting security group ${groupName}`);
  }
  const ec2Client = createEC2Client(awsProfileName);

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
}

/**
 * Delete security groups.
 * WHY: Security groups must be deleted as part of teardown, but only after dependent resources (like RDS) are deleted.
 * @param {string} awsProfileName - The IAM profile to use
 * @param {string|null} killTag - If string (project name), only delete project groups; if null/falsy, delete all (except default)
 * @param {Promise} deletedDBs - Promise that resolves when databases are deleted
 * @param {boolean} verbose - Whether to log details
 * @returns {Promise<boolean[]>} - Array of deletion results
 */
async function deleteSecurityGroups(awsProfileName, killTag, deletedDBs, verbose = false) {
  console.log(`Waiting for databases to be deleted before removing security groups...`);
  await deletedDBs;
  console.log(`Databases deleted. Starting security group deletion.`);

  const ec2Client = createEC2Client(awsProfileName);

  let securityGroups;
  try {
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    securityGroups = describeSecurityGroupsResponse.SecurityGroups ?? [];
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
  return Promise.all(
    groupsToDelete.map((g) => deleteSingleSecurityGroup(g, awsProfileName, verbose)),
  );
}

export {
  ensureEcsTaskExecutionRole,
  verifyawsProfileName,
  listCertificates,
  ensureDatabaseSecurityGroup,
  ensureBalancerSecurityGroup,
  ensureEcsSecurityGroup,
  getAcl,
  deleteSecurityGroups,
};
