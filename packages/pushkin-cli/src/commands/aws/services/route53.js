/**
 * AWS Route53 Service Management
 * Manages Route53 DNS records for the Pushkin project, including creating/updating record sets
 * for CloudFront distributions and deleting records during cleanup.
 * @module route53
 */

import {
  Route53Client,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadPushkinConfig } from "../../../utils/pushkin-config.js";
import { AWS_REGION } from "../constants.js";
import { changeSet } from "../awsConfigs.js";

/**
 * Find the Route53 hosted zone ID for a domain, falling back to parent domains if needed.
 * WHY: A user may configure a subdomain (e.g. gww.cherriechang.com) but the hosted zone is
 * registered for the parent domain (cherriechang.com). We walk up the domain tree until we find a match.
 * @param {string} domain - Domain to look up
 * @param {string} useIAM - IAM profile to use
 * @returns {Promise<string>} Hosted zone ID
 */
const findHostedZone = async (domain, useIAM) => {
  console.log(`Retrieving hosted zone ID for ${domain}`);
  let zoneDomain = domain;

  while (zoneDomain.split(".").length >= 2) {
    try {
      const route53Client = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);
      const data = await route53Client.send(
        new ListHostedZonesByNameCommand({ DNSName: zoneDomain }),
      );

      const matchingZone = data.HostedZones.find((zone) => {
        const zoneName = zone.Name.endsWith(".") ? zone.Name.slice(0, -1) : zone.Name;
        return zoneName === zoneDomain || domain.endsWith(zoneName);
      });

      if (matchingZone) {
        const zoneID = matchingZone.Id.split("/hostedzone/")[1];
        console.log(`Found hosted zone for ${zoneDomain}: ${zoneID}`);
        return zoneID;
      } else if (zoneDomain.split(".").length > 2) {
        // Try parent domain (e.g., gww.cherriechang.com -> cherriechang.com)
        const parts = zoneDomain.split(".");
        parts.shift();
        zoneDomain = parts.join(".");
        console.log(`No exact match, trying parent domain: ${zoneDomain}`);
      } else {
        throw new Error(`No hostedzone found for ${domain}`);
      }
    } catch (error) {
      console.error(`Unable to retrieve hostedzone for ${zoneDomain}: ${error}`);
      throw error;
    }
  }

  throw new Error(`No hostedzone found for ${domain}`);
};

/**
 * Creates four Route53 DNS records for the specified domain pointing to the CloudFront distribution.
 * @param {string} domainName - The domain name
 * @param {string} projName - The project name
 * @param {string} useIAM - The IAM profile to use
 * @param {object} theCloud - The CloudFront distribution object
 * @returns {Promise} - A promise that resolves when the record set is created or updated
 */
const makeRecordSet = async (domainName, projName, useIAM, theCloud) => {
  const zoneID = await findHostedZone(domainName, useIAM);
  const route53 = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);

  // if there was a failed init, there may already be resource record sets
  // which will cause this to fail. So, we'll try to delete them first.
  let existingRecords;
  try {
    const data = await route53.send(new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }));
    existingRecords = data.ResourceRecordSets;
  } catch (e) {
    console.error(`Unable to list resource record sets for ${domainName}`);
    throw e;
  }

  if (existingRecords.length > 0) {
    // Filter out NS and SOA records - these are required and cannot be deleted
    const deletableRecords = existingRecords.filter(
      (record) => record.Type !== "NS" && record.Type !== "SOA",
    );

    if (deletableRecords.length > 0) {
      console.log(
        `Deleting ${deletableRecords.length} existing resource record sets for ${domainName}`,
      );
      const changes = deletableRecords.map((record) => ({
        Action: "DELETE",
        ResourceRecordSet: record,
      }));

      try {
        await route53.send(
          new ChangeResourceRecordSetsCommand({
            HostedZoneId: zoneID,
            ChangeBatch: { Changes: changes },
          }),
        );
      } catch (e) {
        console.error(`Unable to delete resource record sets for ${domainName}: ${e}`);
      }
    } else {
      console.log(
        `No deletable resource record sets found for ${domainName} (only NS and SOA records exist)`,
      );
    }
  }

  const createChange = (name, dnsName, type, setIdentifier) => ({
    Action: "UPSERT",
    ResourceRecordSet: {
      Name: name,
      Type: type,
      SetIdentifier: setIdentifier,
      Region: AWS_REGION,
      AliasTarget: {
        HostedZoneId: "Z2FDTNDATAQYW2",
        DNSName: dnsName,
        EvaluateTargetHealth: false,
      },
    },
  });

  let recordSet = {
    Comment: "",
    Changes: [
      createChange(domainName, theCloud.DomainName, "A", projName),
      createChange(domainName, theCloud.DomainName, "AAAA", projName),
      createChange(`www.${domainName}`, theCloud.DomainName, "A", projName),
      createChange(`www.${domainName}`, theCloud.DomainName, "AAAA", projName),
    ],
  };

  // Wait for any in-progress record set deletions before writing new ones
  await createWaiter(
    { client: route53, maxWaitTime: 600, minDelay: 20, maxDelay: 20 },
    { HostedZoneId: zoneID },
    async (client, input) => {
      const data = await client.send(new ListResourceRecordSetsCommand(input));
      existingRecords = data.ResourceRecordSets;
      const recordsWithSetIdentifier = existingRecords.filter((r) => r.SetIdentifier);
      if (recordsWithSetIdentifier.length === 0) {
        console.log(`All resource record sets for zone ${zoneID} have been deleted.`);
        return { state: WaiterState.SUCCESS };
      }
      console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`);
      for (const record of recordsWithSetIdentifier) {
        console.log(
          `found SetIdentifier ${record.SetIdentifier} for ${record.Name}, ${record.Type}`,
        );
        try {
          await client.send(
            new ChangeResourceRecordSetsCommand({
              HostedZoneId: zoneID,
              ChangeBatch: { Changes: [{ Action: "DELETE", ResourceRecordSet: record }] },
            }),
          );
        } catch (e) {
          console.error(
            `Unable to delete resource record set ${record.SetIdentifier} for ${zoneID}`,
          );
          console.error(e);
        }
      }
      return { state: WaiterState.RETRY };
    },
  );

  let returnVal;
  try {
    console.log(`Creating resource record sets for ${domainName}`);
    returnVal = await route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneID,
        ChangeBatch: recordSet,
      }),
    );
    console.log(`Updated record set for ${domainName}.`);
  } catch (e) {
    console.error(`Unable to create resource record set for ${domainName}`);
    throw e;
  }

  return returnVal;
};

/**
 * Delete all Route53 resource records for the current project's domain.
 * @param useIAM
 * @param killTag
 * @param projName
 */
const deleteResourceRecords = async (useIAM, killTag, projName) => {
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml:`, error);
    throw error;
  }
  let myDomain = pushkinConfig.info.rootDomain;

  console.log(`Deleting resource records for ${myDomain}`);

  let zoneID;
  let listedHostedZones;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const route53Client = factory.createClient(Route53Client);
    const listHostedZonesResponse = await route53Client.send(
      new ListHostedZonesByNameCommand({ DNSName: myDomain }),
    );
    listedHostedZones = {
      stdout: JSON.stringify({ HostedZones: listHostedZonesResponse.HostedZones }),
    };
  } catch (e) {
    console.error(`Unable to retrieve hostedzone for ${myDomain}`);
    throw e;
  }
  if (JSON.parse(listedHostedZones.stdout).HostedZones.length == 0) {
    console.warn(`No hostedzone found for ${myDomain}`);
    //skip deleting resource records
    return true;
  }
  try {
    zoneID = JSON.parse(listedHostedZones.stdout).HostedZones[0].Id.split("/hostedzone/")[1];
  } catch (e) {
    console.error(`Unable to parse hostedzone for ${myDomain}`);
    throw e;
  }

  let resourceRecords = {
    HostedZoneId: zoneID,
    ChangeBatch: {
      Comment: "",
      Changes: [],
    },
  };

  let tempRRList;
  try {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const route53Client = factory.createClient(Route53Client);
    const listResourceRecordSetsResponse = await route53Client.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }),
    );
    tempRRList = {
      stdout: JSON.stringify({
        ResourceRecordSets: listResourceRecordSetsResponse.ResourceRecordSets,
      }),
    };
  } catch (e) {
    console.error(`Unable to retrieve resource records for ${myDomain}`);
    throw e;
  }
  JSON.parse(tempRRList.stdout).ResourceRecordSets.forEach((rr) => {
    if ((rr.SetIdentifier == projName) | (!killTag & rr.SetIdentifier)) {
      let recordSet = {
        Action: "DELETE",
        ResourceRecordSet: rr,
      };
      resourceRecords.ChangeBatch.Changes.push(recordSet);
    }
  });
  if (resourceRecords.ChangeBatch.Changes.length > 0) {
    const profileName = useIAM;
    const factory = new AWSClientFactory(AWS_REGION, profileName);
    const route53Client = factory.createClient(Route53Client);
    return route53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: resourceRecords.HostedZoneId,
        ChangeBatch: resourceRecords.ChangeBatch,
      }),
    );
  } else {
    return true;
  }
};

/**
 * Create a Route53 A record pointing api.{domain} at the load balancer.
 * Skipped entirely if myDomain is "default" (no custom domain — API endpoint must be set manually).
 * @param {string} myDomain
 * @param {string} useIAM
 * @param {string} balancerEndpoint - Load balancer DNS name
 * @param {string} balancerZone - Load balancer canonical hosted zone ID
 * @param {string} projName
 */
const forwardAPI = async (myDomain, useIAM, balancerEndpoint, balancerZone, projName) => {
  if (myDomain === "default") return true;

  const zoneID = await findHostedZone(myDomain, useIAM);

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
    const route53Client = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);
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

  return true;
};

/**
 * Forward API subdomain (api.{domain}) to the load balancer via Route53.
 * Awaits configuredECS and deployedFrontEnd before creating the DNS record — the front-end
 * setup creates a record set for the domain, and we must not overwrite it prematurely.
 * @param {Promise<{balancerEndpoint: string, balancerZone: string}>} configuredECS
 * @param {string} useIAM
 * @param {string} projName
 * @param {string} myDomain
 * @param {Promise} deployedFrontEnd
 */
const forwardAPIWrapper = async (configuredECS, useIAM, projName, myDomain, deployedFrontEnd) => {
  const { balancerEndpoint, balancerZone } = await configuredECS;
  await deployedFrontEnd;
  return forwardAPI(myDomain, useIAM, balancerEndpoint, balancerZone, projName);
};

export { makeRecordSet, deleteResourceRecords, forwardAPIWrapper };
