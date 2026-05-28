/**
 * ECS Service Discovery (Cloud Map) Operations
 * Handles Cloud Map namespace and service registration for internal service communication.
 * WHY: Fargate tasks running in awsvpc network mode each have their own network namespace —
 * there is no shared localhost. Cloud Map creates a private DNS namespace so separate tasks
 * can address each other by name (e.g., message-queue.{projectName}.local:5672).
 * @module aws/services/ecs/discovery
 */

import {
  ServiceDiscoveryClient,
  CreatePrivateDnsNamespaceCommand,
  ListNamespacesCommand,
  CreateServiceCommand as CreateSDServiceCommand,
  ListServicesCommand as ListSDServicesCommand,
  DeleteServiceCommand as DeleteSDServiceCommand,
  DeleteNamespaceCommand,
  GetOperationCommand,
} from "@aws-sdk/client-servicediscovery";
import { AWSClientFactory } from "../../utils/aws-client-factory.js";
import { AWS_REGION } from "../../constants.js";

function createServiceDiscoveryClient(awsProfileName) {
  return new AWSClientFactory(AWS_REGION, awsProfileName).createClient(ServiceDiscoveryClient);
}

// Polling interval and timeout for Cloud Map operations (no built-in SDK waiters exist)
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 5 minutes

/**
 * Poll a Cloud Map operation until it succeeds or fails.
 * @param {ServiceDiscoveryClient} client
 * @param {string} operationId
 * @param {string} description - Human-readable label for log messages
 * @returns {Promise<void>}
 */
async function waitForOperation(client, operationId, description) {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const { Operation } = await client.send(new GetOperationCommand({ OperationId: operationId }));

    if (Operation.Status === "SUCCESS") {
      console.log(`${description} completed successfully.`);
      return Operation;
    }
    if (Operation.Status === "FAIL") {
      throw new Error(`${description} failed: ${Operation.ErrorMessage}`);
    }

    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  throw new Error(`Timeout waiting for: ${description}`);
}

/**
 * Create or get the existing Cloud Map private DNS namespace for a project.
 * @param {string} projectName - The project name
 * @param {string} vpcId - VPC ID to associate the namespace with
 * @param {string} awsProfileName - IAM profile to use
 * @returns {Promise<string>} The namespace ID
 */
async function ensureServiceDiscoveryNamespace(projectName, vpcId, awsProfileName) {
  const client = createServiceDiscoveryClient(awsProfileName);
  const namespaceName = `${projectName}.local`;

  let listResponse;
  try {
    listResponse = await client.send(new ListNamespacesCommand({}));
  } catch (error) {
    console.error("Error listing Service Discovery namespaces:", error);
    throw error;
  }

  const existing = listResponse.Namespaces?.find(
    (ns) => ns.Name === namespaceName && ns.Type === "DNS_PRIVATE",
  );
  if (existing) {
    console.log(`Using existing Service Discovery namespace: ${namespaceName}`);
    return existing.Id;
  }

  console.log(`Creating Service Discovery namespace: ${namespaceName}`);
  let createResponse;
  try {
    createResponse = await client.send(
      new CreatePrivateDnsNamespaceCommand({
        Name: namespaceName,
        Vpc: vpcId,
        Description: `Service discovery namespace for ${projectName}`,
      }),
    );
  } catch (error) {
    console.error("Error creating Service Discovery namespace:", error);
    throw error;
  }

  const operation = await waitForOperation(
    client,
    createResponse.OperationId,
    `Namespace creation (${namespaceName})`,
  );
  const namespaceId = operation.Targets?.NAMESPACE;
  console.log(`Service Discovery namespace created: ${namespaceId}`);
  return namespaceId;
}

/**
 * Register an ECS service with Cloud Map so ECS keeps DNS records up to date.
 * @param {string} serviceName - The service name (e.g., 'message-queue')
 * @param {string} namespaceId - The Cloud Map namespace ID
 * @param {string} awsProfileName - IAM profile to use
 * @returns {Promise<string>} The service registry ARN for use in ECS service configuration
 */
async function registerServiceWithDiscovery(serviceName, namespaceId, awsProfileName) {
  const client = createServiceDiscoveryClient(awsProfileName);

  let listResponse;
  try {
    listResponse = await client.send(
      new ListSDServicesCommand({
        Filters: [{ Name: "NAMESPACE_ID", Values: [namespaceId], Condition: "EQ" }],
      }),
    );
  } catch (error) {
    console.error("Error listing Service Discovery services:", error);
    throw error;
  }

  const existing = listResponse.Services?.find((s) => s.Name === serviceName);
  if (existing) {
    console.log(`Service ${serviceName} already registered with Service Discovery`);
    return existing.Arn;
  }

  console.log(`Registering ${serviceName} with Service Discovery`);
  let createResponse;
  try {
    createResponse = await client.send(
      new CreateSDServiceCommand({
        Name: serviceName,
        NamespaceId: namespaceId,
        DnsConfig: {
          // A records: ECS registers each task's IP, giving DNS-based load balancing
          DnsRecords: [{ Type: "A", TTL: 60 }],
        },
        HealthCheckCustomConfig: { FailureThreshold: 1 },
      }),
    );
  } catch (error) {
    console.error(`Error registering service ${serviceName} with Service Discovery:`, error);
    throw error;
  }

  const arn = createResponse.Service.Arn;
  console.log(`Service ${serviceName} registered with ARN: ${arn}`);
  return arn;
}

/**
 * Delete Cloud Map Service Discovery resources for a project (or all namespaces in armageddon mode).
 * Services must be deleted before their namespace can be removed.
 * @param {string} awsProfileName - IAM profile to use
 * @param {string} projectName - The project name (used to identify the namespace)
 * @param {string|null} killTag - Project name to scope deletion; null = delete everything
 * @returns {Promise<void>}
 */
async function deleteServiceDiscovery(awsProfileName, projectName, killTag) {
  const client = createServiceDiscoveryClient(awsProfileName);
  const namespaceName = `${projectName}.local`;

  console.log("Checking for Service Discovery resources to delete...");

  let namespacesResponse;
  try {
    namespacesResponse = await client.send(new ListNamespacesCommand({}));
  } catch (error) {
    console.error("Error listing Service Discovery namespaces:", error);
    throw error;
  }

  const allNamespaces = namespacesResponse.Namespaces ?? [];
  if (allNamespaces.length === 0) {
    console.log("No Service Discovery namespaces found.");
    return;
  }

  const namespacesToDelete =
    killTag ?
      allNamespaces.filter((ns) => ns.Name === namespaceName && ns.Type === "DNS_PRIVATE")
    : allNamespaces;

  if (namespacesToDelete.length === 0) {
    console.log(`No Service Discovery namespace found for project: ${namespaceName}`);
    return;
  }

  for (const namespace of namespacesToDelete) {
    console.log(`Processing namespace: ${namespace.Name} (${namespace.Id})`);

    // List and delete all services in the namespace before deleting the namespace itself
    let servicesResponse;
    try {
      servicesResponse = await client.send(
        new ListSDServicesCommand({
          Filters: [{ Name: "NAMESPACE_ID", Values: [namespace.Id], Condition: "EQ" }],
        }),
      );
    } catch (error) {
      console.warn(`Error listing services in namespace ${namespace.Name}:`, error.message);
    }

    for (const service of servicesResponse?.Services ?? []) {
      try {
        console.log(`  Deleting service: ${service.Name} (${service.Id})`);
        await client.send(new DeleteSDServiceCommand({ Id: service.Id }));
        console.log(`  Deleted service: ${service.Name}`);
      } catch (error) {
        console.warn(`  Failed to delete service ${service.Name}:`, error.message);
        // Continue — don't let one failure block the rest
      }
    }

    // Delete the namespace (async operation — poll until done)
    try {
      console.log(`Deleting namespace: ${namespace.Name} (${namespace.Id})`);
      const deleteResponse = await client.send(new DeleteNamespaceCommand({ Id: namespace.Id }));
      if (deleteResponse.OperationId) {
        await waitForOperation(
          client,
          deleteResponse.OperationId,
          `Namespace deletion (${namespace.Name})`,
        );
      }
    } catch (error) {
      console.warn(`Failed to delete namespace ${namespace.Name}:`, error.message);
      // Continue — allow other namespaces and cleanup steps to proceed
    }
  }

  console.log("Service Discovery cleanup complete.");
}

export { ensureServiceDiscoveryNamespace, registerServiceWithDiscovery, deleteServiceDiscovery };
