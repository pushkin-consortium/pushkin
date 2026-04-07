import {
  Route53Client,
  ListHostedZonesByNameCommand,
  ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeListenersCommand,
  DeleteListenerCommand,
  DeleteLoadBalancerCommand,
  DescribeTargetGroupsCommand,
  DeleteTargetGroupCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION } from "../constants.js";
import { changeSet } from "../awsConfigs.js";

/**
 *
 * @param configuredECS
 * @param useIAM
 * @param projName
 * @param myDomain
 * @param deployedFrontEnd
 */
const forwardAPIWrapper = async (configuredECS, useIAM, projName, myDomain, deployedFrontEnd) => {
  /**
   *
   * @param myDomain
   * @param useIAM
   * @param balancerEndpoint
   * @param balancerZone
   * @param projName
   */
  const forwardAPI = async (myDomain, useIAM, balancerEndpoint, balancerZone, projName) => {
    // This whole function can be skipped if not using custom domain
    // The API endpoint will have to be set manually
    if (myDomain != "default") {
      console.log(`Retrieving hostedzone ID for ${myDomain}`);
      let zoneID;
      let zoneDomain = myDomain;
      let foundZone = false;

      // Try to find hosted zone, falling back to parent domains if needed
      while (!foundZone && zoneDomain.split(".").length >= 2) {
        try {
          const profileName = useIAM;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const route53Client = factory.createClient(Route53Client);
          const data = await route53Client.send(
            new ListHostedZonesByNameCommand({ DNSName: zoneDomain }),
          );

          // Find exact match or best match
          const matchingZone = data.HostedZones.find((zone) => {
            const zoneName = zone.Name.endsWith(".") ? zone.Name.slice(0, -1) : zone.Name;
            return zoneName === zoneDomain || myDomain.endsWith(zoneName);
          });

          if (matchingZone) {
            zoneID = matchingZone.Id.split("/hostedzone/")[1];
            console.log(`Found hosted zone for ${zoneDomain}: ${zoneID}`);
            foundZone = true;
          } else if (zoneDomain.split(".").length > 2) {
            // Try parent domain (e.g., gww.cherriechang.com -> cherriechang.com)
            const parts = zoneDomain.split(".");
            parts.shift();
            zoneDomain = parts.join(".");
            console.log(`No exact match, trying parent domain: ${zoneDomain}`);
          } else {
            console.error(`No hostedzone found for ${myDomain} or its parent domains`);
            throw new Error(`No hostedzone found for ${myDomain}`);
          }
        } catch (e) {
          if (e.message.includes("No hostedzone found")) {
            throw e;
          }
          console.error(`Unable to retrieve hostedzone for ${zoneDomain}`);
          throw e;
        }
      }

      if (!foundZone) {
        console.error(`No hostedzone found for ${myDomain}`);
        throw new Error(`No hostedzone found for ${myDomain}`);
      }

      // The following will update the resource records, creating them if they don't already exist

      console.log(`Updating record set for ${myDomain} in order to forward API`);
      let recordSet = {
        Comment: "",
        Changes: [],
      };
      recordSet.Changes[0] = JSON.parse(JSON.stringify(changeSet));

      recordSet.Changes[0].ResourceRecordSet.Name = "api.".concat(myDomain);
      recordSet.Changes[0].ResourceRecordSet.AliasTarget.DNSName = balancerEndpoint;
      recordSet.Changes[0].ResourceRecordSet.Type = "A";
      recordSet.Changes[0].ResourceRecordSet.AliasTarget.HostedZoneId = balancerZone;
      recordSet.Changes[0].ResourceRecordSet.SetIdentifier = projName;
      try {
        const profileName = useIAM;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const route53Client = factory.createClient(Route53Client);
        await route53Client.send(
          new ChangeResourceRecordSetsCommand({
            HostedZoneId: zoneID,
            ChangeBatch: recordSet,
          }),
        );
        console.log(`Updated record set for ${myDomain}.`);
      } catch (e) {
        console.error(`Unable to create resource record set for ${myDomain}`);
        throw e;
      }
    }

    return true;
  };

  let balancerEndpoint;
  let balancerZone;
  [balancerEndpoint, balancerZone] = await configuredECS;
  await deployedFrontEnd; //We create a record set for the API during front-end setup, don't want to delete it now!
  let apiForwarded;
  try {
    apiForwarded = forwardAPI(myDomain, useIAM, balancerEndpoint, balancerZone, projName);
  } catch (e) {
    console.error(`Unable to set up forwarding for API`);
    throw e;
  }

  return apiForwarded;
};

/**
 *
 * @param useIAM
 * @param killTag
 */
const deleteLoadBalancer = async (useIAM, killTag) => {
  //FUBAR Need to killize this
  let temp;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    const describeLoadBalancersResponse = await elbv2Client.send(
      new DescribeLoadBalancersCommand({}),
    );
    temp = {
      stdout: JSON.stringify({ LoadBalancers: describeLoadBalancersResponse.LoadBalancers }),
    };
  } catch (e) {
    console.warn(
      "\x1b[31m%s\x1b[0m",
      `Unable to find any load balancers. May have already been deleted. Skipping.`,
    );
    return;
  }
  let balancersToDelete = [];
  JSON.parse(temp.stdout).LoadBalancers.forEach((l) => {
    balancersToDelete.push(l.LoadBalancerArn);
  });
  return Promise.all(
    balancersToDelete.map(async (b) => {
      console.log(`Deleting load balancer ${b}`);
      /**
       *
       * @param loadBalancerName
       * @param useIAM
       */
      async function deleteAllListeners(loadBalancerName, useIAM) {
        let listenersToDelete = [];
        let deletedListeners = [];
        let temp;

        try {
          const profileName = useIAM;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
          const describeListenersResponse = await elbv2Client.send(
            new DescribeListenersCommand({ LoadBalancerArn: loadBalancerName }),
          );
          temp = { stdout: JSON.stringify({ Listeners: describeListenersResponse.Listeners }) };
        } catch (e) {
          console.error(`Unable to list listeners for load balancer ${loadBalancerName}.`);
          throw e;
        }

        listenersToDelete = JSON.parse(temp.stdout).Listeners.map((l) => l.ListenerArn);

        if (listenersToDelete.length > 0) {
          const profileName = useIAM;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
          deletedListeners = Promise.all(
            listenersToDelete.map(async (l) => {
              console.log(`deleting listener: ` + l);
              return await elbv2Client.send(new DeleteListenerCommand({ ListenerArn: l }));
            }),
          );
        }

        if (deletedListeners.length > 0) {
          await deletedListeners;
        }

        // Wait for listeners to be deleted
        while (true) {
          let describedListeners;
          try {
            const profileName = useIAM;
            const factory = new AWSClientFactory(AWS_REGION, profileName);
            const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
            const describeListenersResponse = await elbv2Client.send(
              new DescribeListenersCommand({ LoadBalancerArn: loadBalancerName }),
            );
            describedListeners = {
              stdout: JSON.stringify({ Listeners: describeListenersResponse.Listeners }),
            };
          } catch (e) {
            console.error(`Unable to list listeners for load balancer ${loadBalancerName}.`);
            throw e;
          }

          listenersToDelete = JSON.parse(describedListeners.stdout).Listeners.map(
            (l) => l.ListenerArn,
          );

          if (listenersToDelete.length === 0) {
            console.log("All listeners have been deleted.");
            break;
          }

          console.log(`Waiting for ${listenersToDelete.length} listeners to be deleted...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        return true;
      }

      await deleteAllListeners(b, useIAM);

      let deletedLoadBalancer;
      try {
        const profileName = useIAM;
        const factory = new AWSClientFactory(AWS_REGION, profileName);
        const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
        deletedLoadBalancer = await elbv2Client.send(
          new DeleteLoadBalancerCommand({ LoadBalancerArn: b }),
        );
      } catch (e) {
        console.error(`Unable to delete load balancer ${b}`);
        console.error(e);
      }
    }),
  );

  return true;
};

/**
 *
 * @param useIAM
 * @param deletedLoadBalancer
 */
const deleteTargetGroup = async (useIAM, deletedLoadBalancer) => {
  //FUBAR Need to killize this
  await deletedLoadBalancer;
  let getTargetGroups;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
    const describeTargetGroupsResponse = await elbv2Client.send(
      new DescribeTargetGroupsCommand({}),
    );
    getTargetGroups = {
      stdout: JSON.stringify({ TargetGroups: describeTargetGroupsResponse.TargetGroups }),
    };
  } catch (e) {
    console.error(`Unable to list target groups`);
    throw e;
  }
  let targetGroups = JSON.parse(getTargetGroups.stdout).TargetGroups.map((tg) => {
    return tg.TargetGroupArn;
  });
  if (targetGroups.length > 0) {
    return Promise.all(
      targetGroups.map(async (tg) => {
        try {
          const profileName = useIAM;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
          await elbv2Client.send(new DescribeTargetGroupsCommand({ TargetGroupArns: [tg] }));
        } catch (e) {
          console.warn(
            "\x1b[31m%s\x1b[0m",
            `Unable to find target group ${tg}. May have already been deleted. Skipping.`,
          );
          return true;
        }
        try {
          const profileName = useIAM;
          const factory = new AWSClientFactory(AWS_REGION, profileName);
          const elbv2Client = factory.createClient(ElasticLoadBalancingV2Client);
          await elbv2Client.send(new DeleteTargetGroupCommand({ TargetGroupArn: tg }));
        } catch (e) {
          console.error(`Unable to delete associated target group`);
          console.error(e);
        }
      }),
    );
  } else {
    console.log(`No target group. Skipping.`);
    return true;
  }
};

// Export all functions
export { forwardAPIWrapper, deleteLoadBalancer, deleteTargetGroup };
