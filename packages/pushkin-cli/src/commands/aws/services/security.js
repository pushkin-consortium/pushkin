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
import { AWS_REGION } from "../constants.js";
import { pushkinACL } from "../awsConfigs.js";

/**
 * Check if the IAM user is configured on the AWS SDK
 * @param {*} useIAM - The IAM user to check
 */
const checkIAMUser = async (useIAM) => {
  const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const sts = factory.createClient(STSClient);

  try {
    await sts.send(new GetCallerIdentityCommand({}));
  } catch (e) {
    console.error(
      `The IAM user ${profileName} is not configured on the AWS SDK. For more information see https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-shared.html`,
    );
    throw e;
  }
};

/**
 * Handle security groups
 * @param {*} useIAM - The IAM role to use
 * @param {*} projName - The project name
 * @returns {Promise<string>} - The security group ID for the database group
 */
const handleSecurityGroups = async (useIAM, projName) => {
  /**
   * Create security group for databases
   * @param {*} useIAM - The IAM role to use
   * @param {*} projName - The project name
   * @returns {Promise<string>} - The security group ID for the database group
   */
  const createDatabaseGroup = async (useIAM, projName) => {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ec2Client = factory.createClient(EC2Client);
    let stdOut;
    try {
      const createSGResponse = await ec2Client.send(
        new CreateSecurityGroupCommand({
          GroupName: "DatabaseGroup",
          Description: "For connecting to databases",
          TagSpecifications: [
            {
              ResourceType: "security-group",
              Tags: [{ Key: "PUSHKIN", Value: projName }],
            },
          ],
        }),
      );
      stdOut = { stdout: JSON.stringify({ GroupId: createSGResponse.GroupId }) };

      await ec2Client.send(
        new AuthorizeSecurityGroupIngressCommand({
          GroupName: "DatabaseGroup",
          IpPermissions: [
            {
              IpProtocol: "tcp",
              FromPort: 5432,
              ToPort: 5432,
              Ipv6Ranges: [{ CidrIpv6: "::/0" }],
              IpRanges: [{ CidrIp: "0.0.0.0/0" }], // This means anywhere on the internet, quite permissive
            },
          ],
        }),
      );
    } catch (e) {
      console.error(`Failed to create security group for databases`);
      throw e;
    }
    return JSON.parse(stdOut.stdout).GroupId; //remember security group in order to use later!
  };

  let temp;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ec2Client = factory.createClient(EC2Client);
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    temp = {
      stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
    };
  } catch (e) {
    console.error(`Failed to retrieve list of security groups from aws`);
    throw e;
  }
  let foundDBGroup;
  JSON.parse(temp.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName == "DatabaseGroup") {
      foundDBGroup = g.GroupId;
    }
  });

  return new Promise((resolve) => {
    if (foundDBGroup) {
      console.log(`Database security group already exists. Skipping creation.`);
      resolve(foundDBGroup);
    } else {
      console.log("Creating security group for databases");
      resolve(createDatabaseGroup(useIAM, projName));
    }
  });
};

/**
 *
 * @param useIAM
 */
const makeACL = async (useIAM) => {
  //This function first checks for an ACL named pushkinACL. If so, return ARN.
  //If not, create one and return the ARN.
  //We don't store anything because the ACL is always called 'pushkinACL' and the ID and ARN can always be looked up if needed.
  /**
   *
   * @param useIAM
   */
  const findACL = async (useIAM) => {
    let ACLarn;
    let temp;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const wafv2Client = factory.createClient(WAFv2Client);
      const listWebACLsResponse = await wafv2Client.send(
        new ListWebACLsCommand({ Scope: "CLOUDFRONT" }),
      );
      temp = { stdout: JSON.stringify({ WebACLs: listWebACLsResponse.WebACLs }) };
    } catch (e) {
      console.error(`Unable to get list of ACLs`);
      throw e;
    }
    if (temp.stdout != "") {
      JSON.parse(temp.stdout).WebACLs.forEach((d) => {
        let tempCheck = false;
        try {
          tempCheck = d.Name == "pushkinACL";
        } catch (e) {
          console.warn("\x1b[31m%s\x1b[0m", `Problem reading ACL list.`);
          throw e;
        }
        if (tempCheck) {
          ACLarn = d.ARN;
        }
      });
    }
    return ACLarn;
  };

  let ACLarn = await findACL(useIAM);
  if (!ACLarn) {
    let temp;
    try {
      const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const wafv2Client = factory.createClient(WAFv2Client);
      const createWebACLResponse = await wafv2Client.send(
        new CreateWebACLCommand({
          Name: "pushkinACL",
          Scope: "CLOUDFRONT",
          DefaultAction: { Allow: {} },
          Rules: pushkinACL.Rules,
          VisibilityConfig: pushkinACL.VisibilityConfig,
        }),
      );
      temp = { stdout: JSON.stringify({ Summary: createWebACLResponse.Summary }) };
    } catch (e) {
      console.error(`Unable to create ACL`);
      throw e;
    }
    ACLarn = JSON.parse(temp.stdout).Summary.ACLarn;
  }
  console.log(`ACL created`);
  return ACLarn;
};

/**
 *
 * @param useIAM
 * @param killTag
 * @param deletedDBs
 */
const deleteSecurityGroups = async (useIAM, killTag, deletedDBs) => {
  console.log(`Before deleting security groups, wait for DBs to be completed deleted`);
  await deletedDBs;
  console.log(`DBs deleted. Can start deleting security groups.`);
  /**
   *
   * @param g
   * @param useIAM
   * @param killTag
   */
  const deleteMyGroup = async (g, useIAM, killTag) => {
    console.log(`Deleting security group ${g}`);
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ec2Client = factory.createClient(EC2Client);
    try {
      await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupNames: [g] }));
    } catch (e) {
      console.log(e);
      console.log(`No security group ${g}.`);
      return true;
    }
    try {
      await ec2Client.send(new DeleteSecurityGroupCommand({ GroupName: g }));
    } catch (e) {
      console.warn(
        "\x1b[31m%s\x1b[0m",
        `Unable to delete security group ${g}. PROBABLY this is because AWS needs something else to delete first.\n We recommend you retry 'pushkin aws armageddon' in a few minutes.`,
      );
      console.warn("\x1b[31m%s\x1b[0m", e);
      return true;
    }
    return true;
  };

  let groupsToDelete = [];
  let tempGroupList;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const ec2Client = factory.createClient(EC2Client);
    const describeSecurityGroupsResponse = await ec2Client.send(
      new DescribeSecurityGroupsCommand({}),
    );
    tempGroupList = {
      stdout: JSON.stringify({ SecurityGroups: describeSecurityGroupsResponse.SecurityGroups }),
    };
  } catch (e) {
    console.error(`Unable to list security groups`);
    throw e;
  }
  JSON.parse(tempGroupList.stdout).SecurityGroups.forEach((g) => {
    if (g.GroupName != "default") {
      //can't delete the default!
      if (!killTag) {
        //kill them all
        groupsToDelete.push(g.GroupName);
      } else {
        if (g.Tags[0].Value == killTag) {
          groupsToDelete.push(g.GroupName);
        }
      }
    }
  });
  return Promise.all(groupsToDelete.map((g) => deleteMyGroup(g, useIAM, killTag)));
};
// Export all functions
export { checkIAMUser, handleSecurityGroups, makeACL, deleteSecurityGroups };
