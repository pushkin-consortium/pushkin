import {
  Route53Client,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION } from "../constants.js";
import fs from "graceful-fs";
import path from "path";
import jsYaml from "js-yaml";

/**
 * This function is called from within deployFrontEnd(). It creates four Route53 DNS records for the specified domainName for the CloudFront distribution created in deployFrontEnd().
 * @param {string} domainName - The domain name
 * @param {string} projName - The project name
 * @param {string} useIAM - The IAM profile to use
 * @param {object} theCloud - The CloudFront distribution object
 * @returns {Promise} - A promise that resolves when the record set is created or updated
 */
const makeRecordSet = async (domainName, projName, useIAM, theCloud) => {
  const profileName = useIAM;
  const factory = new AWSClientFactory(AWS_REGION, profileName);
  const route53 = factory.createClient(Route53Client);

  let zoneID;

  // For subdomains, we need to find the parent domain's hosted zone
  // e.g., for "gww.cherriechang.com", we need to find "cherriechang.com"
  const findParentZone = (domain) => {
    const parts = domain.split(".");
    // Try the domain itself first, then progressively remove subdomains
    for (let i = 0; i < parts.length - 1; i++) {
      const candidate = parts.slice(i).join(".");
      if (parts.length - i >= 2) {
        // Must have at least domain.tld
        return candidate;
      }
    }
    return domain;
  };

  // Try to find hosted zone, starting with the full domain and working up to parent domains
  let zoneDomain = domainName;
  let foundZone = false;

  while (!foundZone) {
    try {
      const data = await route53.send(new ListHostedZonesByNameCommand({ DNSName: zoneDomain }));

      // Find exact match or best match
      const matchingZone = data.HostedZones.find((zone) => {
        const zoneName = zone.Name.endsWith(".") ? zone.Name.slice(0, -1) : zone.Name;
        return zoneName === zoneDomain || domainName.endsWith(zoneName);
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
        console.error(`No hostedzone found for ${domainName} or its parent domains`);
        throw new Error(`No hostedzone found for ${domainName}`);
      }
    } catch (e) {
      if (e.message.includes("No hostedzone found")) {
        throw e;
      }
      console.error(`Unable to retrieve hostedzone for ${zoneDomain}`);
      throw e;
    }
  }

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

  /**
   * Creates a recordset change object for the DNS record
   * @param {string} name - The DNS record name users will access
   * @param {string} dnsName - The DNS name of the CloudFront distribution
   * @param {string} type - The DNS record type (A or AAAA)
   * @param {string} setIdentifier - The set identifier for the record
   * @returns {object} - The change object
   */
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

  /**
   * Waits for all resource record sets to be deleted for a given hosted zone
   * @param zoneID - The hosted zone ID
   */
  const waitForRecordSetDeletion = async (zoneID) => {
    while (true) {
      try {
        const data = await route53.send(
          new ListResourceRecordSetsCommand({ HostedZoneId: zoneID }),
        );
        existingRecords = data.ResourceRecordSets;
      } catch (e) {
        console.error(`Unable to list resource record sets for ${zoneID}`);
        throw e;
      }

      if (existingRecords.some((r) => r.SetIdentifier)) {
        console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`);

        for (const record of existingRecords) {
          if (record.SetIdentifier) {
            console.log(
              `found SetIdentifier ${record.SetIdentifier} for ${record.Name}, ${record.Type}`,
            );
            //try deleting this record set
            try {
              await route53.send(
                new ChangeResourceRecordSetsCommand({
                  HostedZoneId: zoneID,
                  ChangeBatch: {
                    Changes: [
                      {
                        Action: "DELETE",
                        ResourceRecordSet: record,
                      },
                    ],
                  },
                }),
              );
            } catch (e) {
              console.error(
                `Unable to delete resource record set ${record.SetIdentifier} for ${zoneID}`,
              );
              console.error(e);
            }
          } else {
            console.log(
              `No SetIdentifier ${record.SetIdentifier} for ${record.Name}, ${record.Type}`,
            );
          }
        }
      } else {
        console.log(`All resource record sets for zone ${zoneID} have been deleted.`);
        break;
      }

      console.log(`Waiting for resource record sets to be deleted for zone ${zoneID}...`);
      await new Promise((resolve) => setTimeout(resolve, 20000));
    }
  };

  await waitForRecordSetDeletion(zoneID);

  // create the new record set
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
 *
 * @param useIAM
 * @param killTag
 * @param projName
 */
const deleteResourceRecords = async (useIAM, killTag, projName) => {
  let temp;
  let pushkinConfig;
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), "pushkin.yaml"), "utf8");
    pushkinConfig = jsYaml.load(temp);
  } catch (e) {
    console.error(`Couldn't load pushkin.yaml`);
    throw e;
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
   * Choose a domain for the site
   * @param {string} useIAM - The IAM profile name
   * @returns {Promise<string>} - A promise that resolves to the chosen domain
   */
  const chooseDomain = async (useIAM) => {
    console.log("Choosing domain name for site");
    let temp;
    try {
      const profileName = useIAM;
      const factory = new AWSClientFactory(AWS_REGION, profileName);
      const route53DomainsClient = factory.createClient(Route53DomainsClient);
      const listDomainsResponse = await route53DomainsClient.send(new ListDomainsCommand({}));
      temp = { stdout: JSON.stringify({ Domains: listDomainsResponse.Domains }) };
    } catch (e) {
      console.error(`Unable to get list of SSL certificates`);
    }
    let domains = ["default"];
    JSON.parse(temp.stdout).Domains.forEach((c) => {
      domains.push(c.DomainName);
    });
    domains.push("Enter a custom domain/subdomain");

    return new Promise((resolve) => {
      console.log(`Choosing...`);
      inquirer
        .prompt([
          {
            type: "list",
            name: "domain",
            choices: domains,
            default: 0,
            message: "Which domain would you like to use for your site?",
          },
        ])
        .then(async (answers) => {
          if (answers.domain === "Enter a custom domain/subdomain") {
            const customDomain = await inquirer.prompt([
              {
                type: "input",
                name: "customDomain",
                message: "Enter your custom domain or subdomain (e.g., subdomain.example.com):",
                validate: (input) => {
                  if (!input || input.trim().length === 0) {
                    return "Domain cannot be empty";
                  }
                  return true;
                },
              },
            ]);
            resolve(customDomain.customDomain);
          } else {
            resolve(answers.domain);
          }
        });
    });
  };
  
// Export all functions
export { makeRecordSet, deleteResourceRecords };
