/**
 * AWS Route53 Service Management
 * Manages Route53 DNS records for the Pushkin project, including creating/updating record sets
 * for CloudFront distributions and deleting records during cleanup.
 * @module route53
 */

import {
  Route53Client,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
  paginateListHostedZonesByName,
  paginateListResourceRecordSets,
} from "@aws-sdk/client-route-53";
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { loadPushkinConfig } from "../../../utils/pushkin-config.js";
import { AWS_REGION } from "../constants.js";

/**
 * Find the Route53 hosted zone ID for a domain, falling back to parent domains if needed.
 * WHY: A user may configure a subdomain (e.g. something.gameswithwords.org) but the hosted zone is
 * registered for the parent domain (gameswithwords.org). We walk up the domain tree until we find a match.
 * @param {string} domain - Domain to look up
 * @param {string} useIAM - IAM profile to use
 * @returns {Promise<string>} Hosted zone ID
 */
const findHostedZone = async (domain, useIAM) => {
  // NOTE: Possible future improvement: if we find a parent domain match, we could ask the user if
  // they want to create a new hosted zone for the subdomain (if they have permissions to do so) in
  // order to keep the site's DNS records separate and avoid potential conflicts with other projects
  // using the same parent domain.
  console.log(`Retrieving hosted zone ID for ${domain}`);
  const route53Client = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);
  let zoneDomain = domain;

  while (zoneDomain.split(".").length >= 2) {
    let matchingZone;
    try {
      for await (const page of paginateListHostedZonesByName(
        { client: route53Client },
        { DNSName: zoneDomain },
      )) {
        matchingZone = page.HostedZones.find((zone) => {
          const zoneName = zone.Name.endsWith(".") ? zone.Name.slice(0, -1) : zone.Name;
          return zoneName === zoneDomain || domain.endsWith("." + zoneName);
        });
        if (matchingZone) break;
      }
    } catch (error) {
      console.error(`Unable to retrieve hosted zone for ${zoneDomain}::`, error);
      throw error;
    }

    if (matchingZone) {
      const zoneID = matchingZone.Id.split("/hostedzone/")[1];
      console.log(`Found hosted zone for ${zoneDomain}: ${zoneID}`);
      return zoneID;
    }

    if (zoneDomain.split(".").length <= 2) break;

    const parts = zoneDomain.split(".");
    parts.shift();
    zoneDomain = parts.join(".");
    console.log(`No exact match, trying parent domain: ${zoneDomain}`);
  }

  throw new Error(`No hosted zone found for ${domain}`);
};

/**
 * Creates four Route53 DNS records for the specified domain pointing to the CloudFront distribution.
 * WHY: We need four records (A and AAAA for both the root domain and www subdomain) to properly
 * route traffic to the site.
 * @param {string} domainName - The domain name
 * @param {string} projName - The project name
 * @param {string} useIAM - The IAM profile to use
 * @param {object} theCloud - The CloudFront distribution object
 * @returns {Promise} - A promise that resolves when the record set is created or updated
 */
const makeRecordSet = async (domainName, projName, useIAM, theCloud) => {
  const zoneID = await findHostedZone(domainName, useIAM);
  const route53 = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);

  // If there was a failed init, there may already be resource record sets
  // which will cause this to fail. So, we'll try to delete them first.
  let existingRecords;
  try {
    const data = await route53.send(new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }));
    existingRecords = data.ResourceRecordSets;
  } catch (error) {
    console.error(`Unable to list resource record sets for ${domainName}:`, error);
    throw error;
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
      } catch (error) {
        console.error(`Unable to delete resource record sets for ${domainName}:`, error);
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
        HostedZoneId: "Z2FDTNDATAQYW2", // Cloudfront global canonical hosted zone ID
        DNSName: dnsName,
        EvaluateTargetHealth: false,
      },
    },
  });

  const recordSet = {
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
      const { ResourceRecordSets } = await client.send(new ListResourceRecordSetsCommand(input));
      const recordsWithSetIdentifier = ResourceRecordSets.filter((record) => record.SetIdentifier);
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
        } catch (error) {
          console.error(
            `Unable to delete resource record set ${record.SetIdentifier} for ${zoneID}: ${error}`,
          );
        }
      }
      return { state: WaiterState.RETRY };
    },
  );

  let recordSetChange;
  try {
    console.log(`Creating resource record sets for ${domainName}`);
    recordSetChange = await route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneID,
        ChangeBatch: recordSet,
      }),
    );
    console.log(`Updated record set for ${domainName}.`);
  } catch (error) {
    console.error(`Unable to create resource record set for ${domainName}:`, error);
    throw error;
  }

  return recordSetChange;
};

/**
 * Delete all Route53 resource records for the current project's domain.
 * WHY: We want to clean up DNS records when tearing down the project to avoid future projects
 * accidentally reusing them and to keep the hosted zone tidy.
 * @param useIAM – The IAM profile to use
 * @param killTag – Whether to delete records with a specific tag
 * @param projName – The project name
 */
async function deleteResourceRecords(useIAM, killTag, projName) {
  let pushkinConfig;
  try {
    pushkinConfig = await loadPushkinConfig();
  } catch (error) {
    console.error(`Failed to load pushkin.yaml::`, error);
    throw error;
  }
  const myDomain = pushkinConfig.info.rootDomain;

  console.log(`Deleting resource records for ${myDomain}`);

  let zoneID;
  try {
    zoneID = await findHostedZone(myDomain, useIAM);
  } catch (error) {
    if (error.message.startsWith("No hosted zone found")) {
      console.warn(`No hosted zone found for ${myDomain}`);
      return true;
    }
    throw error;
  }

  const route53Client = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);
  const changes = [];

  try {
    for await (const page of paginateListResourceRecordSets(
      { client: route53Client },
      { HostedZoneId: zoneID },
    )) {
      for (const rr of page.ResourceRecordSets) {
        if (rr.SetIdentifier === projName || (!killTag && rr.SetIdentifier)) {
          changes.push({ Action: "DELETE", ResourceRecordSet: rr });
        }
      }
    }
  } catch (error) {
    console.error(`Unable to retrieve resource records for ${myDomain}::`, error);
    throw error;
  }

  if (changes.length === 0) return true;

  return route53Client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneID,
      ChangeBatch: { Comment: "", Changes: changes },
    }),
  );
}

/**
 * Create a Route53 A record pointing api.{domain} at the load balancer.
 * Awaits configuredECS and deployedFrontEnd before creating the DNS record — the front-end
 * setup creates a record set for the domain, and we must not overwrite it prematurely.
 * Skipped entirely if myDomain is "default" (no custom domain).
 * @param {Promise<{balancerEndpoint: string, balancerZone: string}>} configuredECS
 * @param {string} useIAM – The IAM profile to use
 * @param {string} projName – The project name
 * @param {string} myDomain – The root domain for the site (e.g. gameswithwords.org)
 * @param {Promise} deployedFrontEnd – A promise that resolves when the front-end is deployed
 */
const forwardAPI = async (configuredECS, useIAM, projName, myDomain, deployedFrontEnd) => {
  const { balancerEndpoint, balancerZone } = await configuredECS;
  await deployedFrontEnd;

  if (myDomain === "default") return true;

  const zoneID = await findHostedZone(myDomain, useIAM);

  console.log(`Updating record set for ${myDomain} in order to forward API`);
  const recordSet = {
    Comment: "",
    Changes: [
      {
        Action: "UPSERT",
        ResourceRecordSet: {
          Name: `api.${myDomain}`,
          Type: "A",
          Region: AWS_REGION,
          SetIdentifier: projName,
          AliasTarget: {
            HostedZoneId: balancerZone,
            DNSName: balancerEndpoint,
            EvaluateTargetHealth: false,
          },
        },
      },
    ],
  };
  try {
    const route53Client = new AWSClientFactory(AWS_REGION, useIAM).createClient(Route53Client);
    await route53Client.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: zoneID,
        ChangeBatch: recordSet,
      }),
    );
    console.log(`Updated record set for ${myDomain}.`);
  } catch (error) {
    console.error(`Unable to create resource record set for ${myDomain}:`, error);
    throw error;
  }

  return true;
};

export { makeRecordSet, deleteResourceRecords, forwardAPI };
