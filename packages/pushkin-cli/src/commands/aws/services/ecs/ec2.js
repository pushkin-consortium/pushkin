/**
 *
 * @module aws/services/ecs/ec2
 */

import { EC2Client, DescribeSubnetsCommand, DescribeVpcsCommand } from "@aws-sdk/client-ec2";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../../utils/aws-profile.js";
import { AWS_REGION } from "../constants.js";

function createEc2Client() {
  const factory = new AWSClientFactory(AWS_REGION, getAwsProfile());
  return factory.createClient(EC2Client);
}

/**
 * Get the default VPC (Virtual Private Cloud) ID for the current region.
 * WHY: VPC is needed for both the load balancer and Fargate tasks to define the network environment they run in.
 * @returns {Promise<string>} Default VPC ID
 */
async function getDefaultVpc() {
  const ec2Client = createEc2Client();
  const { Vpcs } = await ec2Client.send(new DescribeVpcsCommand({}));
  const defaultVpc = Vpcs.find((v) => v.IsDefault);
  if (!defaultVpc)
    throw new Error(
      "No default VPC found in region. To restore it, see https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc.html#create-default-vpc",
    );
  return defaultVpc.VpcId;
}

/**
 * Asynchronously retrieves available subnets (sets of IP addresses) in the AWS zone and maps them by availability zone.
 * WHY: Subnets are needed for both the load balancer and Fargate tasks to define the network environment they run in.
 * @returns {Promise} A promise that resolves to an object mapping availability zones to subnet IDs
 */
async function getSubnets() {
  const ec2Client = createEc2Client();
  const { Subnets } = await ec2Client.send(new DescribeSubnetsCommand({}));
  const subnets = Subnets.reduce((acc, subnet) => {
    // This overwrites any duplicate availability zones (multiple subnets in the same zone) with
    // the last one found, but in practice, AWS should not return duplicates.
    acc[subnet.AvailabilityZone] = subnet.SubnetId;
    return acc;
  }, {});
  return subnets;
}

export { getSubnets, getDefaultVpc };
