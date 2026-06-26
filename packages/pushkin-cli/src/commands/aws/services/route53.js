/**
 * Handles creating, updating and deleting Route53 DNS records for CloudFront distributions in Pushkin projects.
 * @module aws/services/route53
 */

import {
  Route53Client,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
import { Route53DomainsClient, ListDomainsCommand } from "@aws-sdk/client-route-53-domains";
import { createWaiter, WaiterState } from "@smithy/util-waiter";
import { loadPushkinConfig } from "../../../utils/pushkin-config.js";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../utils/aws-profile.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { AWS_REGION } from "../constants.js";

function createRoute53Client() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(Route53Client);
}

function createRoute53DomainsClient() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(Route53DomainsClient);
}

/**
 * List all registered domains in Route53 for the given AWS profile.
 * @returns {Promise<object>} - A promise that resolves to the list of registered domains
 */
async function listDomains() {
  const route53DomainsClient = createRoute53DomainsClient();
  return await route53DomainsClient.send(new ListDomainsCommand({}));
}
/**
 * Find the Route53 hosted zone ID for a domain, falling back to parent domains if needed.
 * WHY: A user may configure a subdomain (e.g. something.gameswithwords.org) but the hosted zone is
 * registered for the parent domain (gameswithwords.org). We walk up the domain tree until we find a match.
 * @param {string} domain - Domain to look up
 * @returns {Promise<string>} Hosted zone ID
 */
async function findHostedZone(domain) {
  // NOTE: Possible future improvement: if we find a parent domain match, we could ask the user if
  // they want to create a new hosted zone for the subdomain (if they have permissions to do so) in
  // order to keep the site's DNS records separate and avoid potential conflicts with other projects
  // using the same parent domain.
  console.log(`Retrieving hosted zone ID for ${domain}`);
  const route53Client = createRoute53Client();
  let zoneDomain = domain;

  while (true) {
    let matchingZone;
    let params = { DNSName: zoneDomain };
    let response;
    do {
      response = await route53Client.send(new ListHostedZonesByNameCommand(params));
      matchingZone = response.HostedZones.find((zone) => {
        const zoneName = zone.Name.endsWith(".") ? zone.Name.slice(0, -1) : zone.Name;
        return zoneName === zoneDomain || domain.endsWith("." + zoneName);
      });
      params = { DNSName: response.NextDNSName, HostedZoneId: response.NextHostedZoneId };
    } while (!matchingZone && response.IsTruncated);

    if (matchingZone) {
      const zoneID = matchingZone.Id.split("/hostedzone/")[1];
      console.log(`Found hosted zone for ${zoneDomain}: ${zoneID}`);
      return zoneID;
    }

    const parts = zoneDomain.split(".");
    if (parts.length <= 2) break; // Already at root domain; no point stripping the TLD
    parts.shift();
    zoneDomain = parts.join(".");
    console.log(`No exact match, trying parent domain: ${zoneDomain}`);
  }

  throw new Error(`No hosted zone found for ${domain}`);
}

/**
 * Creates four Route53 DNS records for the specified domain pointing to the CloudFront distribution.
 * WHY: We need four records (A and AAAA for both the root domain and www subdomain) to properly
 * route traffic to the site.
 * @param {string} domainName
 * @param {string} projectName
 * @param {{DomainName: string}} theCloud - The CloudFront distribution object
 * @returns {Promise<object>} - A promise that resolves with the ChangeResourceRecordSets response
 */
async function makeRecordSet(domainName, projectName, theCloud) {
  const zoneID = await findHostedZone(domainName);
  const route53 = createRoute53Client();

  // If there was a failed init, there may already be resource record sets
  // which will cause this to fail. So, we'll try to delete them first.
  const { ResourceRecordSets: existingRecords } = await route53.send(
    new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }),
  );

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
        // Deletion failure is non-fatal: UPSERT below handles pre-existing records.
        // If a real conflict persists, the UPSERT will surface it with a clearer error.
        console.warn(`Unable to delete resource record sets for ${domainName}:`, error);
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
      createChange(domainName, theCloud.DomainName, "A", projectName),
      createChange(domainName, theCloud.DomainName, "AAAA", projectName),
      createChange(`www.${domainName}`, theCloud.DomainName, "A", projectName),
      createChange(`www.${domainName}`, theCloud.DomainName, "AAAA", projectName),
    ],
  };

  // Wait for any in-progress record set deletions before writing new ones.
  // WHY: The waiter also retries deletion of records with SetIdentifiers on each poll cycle —
  // this handles eventual consistency where Route53 may not immediately reflect the deletion.
  const { route53: route53Timeouts } = loadAwsConfig().timeouts;
  await createWaiter(
    {
      client: route53,
      maxWaitTime: route53Timeouts.recordSetDeletion.maxWaitTime,
      minDelay: route53Timeouts.recordSetDeletion.checkInterval,
      maxDelay: route53Timeouts.recordSetDeletion.checkInterval,
    },
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

  console.log(`Creating resource record sets for ${domainName}`);
  const recordSetChange = await route53.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneID,
      ChangeBatch: recordSet,
    }),
  );
  console.log(`Updated record set for ${domainName}.`);
  return recordSetChange;
}

/**
 * Delete all Route53 resource records for the current project's domain.
 * WHY: We want to clean up DNS records when tearing down the project to avoid future projects
 * accidentally reusing them and to keep the hosted zone tidy.
 * @param {string|null} killTag - Project name to filter by; if null/falsy, deletes all records with a SetIdentifier
 * @param {string} projectName
 */
async function deleteResourceRecords(killTag, projectName) {
  const pushkinConfig = loadPushkinConfig();
  const myDomain = pushkinConfig.info.rootDomain;

  console.log(`Deleting resource records for ${myDomain}`);

  let zoneID;
  try {
    zoneID = await findHostedZone(myDomain);
  } catch (error) {
    if (error.message.startsWith("No hosted zone found")) {
      console.warn(`No hosted zone found for ${myDomain}`);
      return true;
    }
    throw error;
  }

  const route53Client = createRoute53Client();
  const changes = [];

  let isTruncated = true;
  let nextRecordName;
  let nextRecordType;
  while (isTruncated) {
    const response = await route53Client.send(
      new ListResourceRecordSetsCommand({
        HostedZoneId: zoneID,
        StartRecordName: nextRecordName,
        StartRecordType: nextRecordType,
      }),
    );
    for (const rr of response.ResourceRecordSets) {
      if (rr.SetIdentifier === projectName || (!killTag && rr.SetIdentifier)) {
        changes.push({ Action: "DELETE", ResourceRecordSet: rr });
      }
    }
    isTruncated = response.IsTruncated;
    nextRecordName = response.NextRecordName;
    nextRecordType = response.NextRecordType;
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
 * Skipped entirely if siteDomain is null (no custom domain).
 * @param {Promise<{loadBalancerEndpoint: string, loadBalancerZone: string}>} configuredEcs
 * @param {string} projectName – The project name
 * @param {string} siteDomain – The root domain for the site (e.g. gameswithwords.org)
 * @param {Promise} deployedFrontEnd – A promise that resolves when the front-end is deployed
 */
async function forwardAPI(configuredEcs, projectName, siteDomain, deployedFrontEnd) {
  const { loadBalancerEndpoint, loadBalancerZone } = await configuredEcs;
  await deployedFrontEnd;

  if (!siteDomain) return true;

  const zoneID = await findHostedZone(siteDomain);

  console.log(`Updating record set for ${siteDomain} in order to forward API`);
  const recordSet = {
    Comment: "",
    Changes: [
      {
        Action: "UPSERT",
        ResourceRecordSet: {
          Name: `api.${siteDomain}`,
          Type: "A",
          Region: AWS_REGION,
          SetIdentifier: projectName,
          AliasTarget: {
            HostedZoneId: loadBalancerZone,
            DNSName: loadBalancerEndpoint,
            EvaluateTargetHealth: false,
          },
        },
      },
    ],
  };
  const route53Client = createRoute53Client();
  await route53Client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneID,
      ChangeBatch: recordSet,
    }),
  );
  console.log(`Updated record set for ${siteDomain}.`);
  return true;
}

export { listDomains, makeRecordSet, deleteResourceRecords, forwardAPI };
