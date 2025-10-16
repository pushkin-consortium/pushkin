import { AWSClientFactory } from "../../../utils/aws-client-factory.js";
import { RDSClient } from "@aws-sdk/client-rds";
import { S3Client } from "@aws-sdk/client-s3";
import { ECSClient } from "@aws-sdk/client-ecs";

/**
 * Unit tests for AWSClientFactory
 * Tests the factory pattern for creating AWS SDK clients
 */

describe("AWSClientFactory", () => {
  const testRegion = "us-east-1";
  const testProfile = "test-profile";

  describe("constructor", () => {
    test("accepts string profile name", () => {
      const factory = new AWSClientFactory(testRegion, testProfile);
      expect(factory.profileName).toBe(testProfile);
      expect(factory.region).toBe(testRegion);
    });
  });

  describe("client creation", () => {
    let factory;

    beforeEach(() => {
      factory = new AWSClientFactory(testRegion, testProfile);
    });

    test("createClient returns RDSClient instance", () => {
      const client = factory.createClient(RDSClient);
      expect(client).toBeInstanceOf(RDSClient);
    });

    test("createClient returns S3Client instance", () => {
      const client = factory.createClient(S3Client);
      expect(client).toBeInstanceOf(S3Client);
    });

    test("createClient returns ECSClient instance", () => {
      const client = factory.createClient(ECSClient);
      expect(client).toBeInstanceOf(ECSClient);
    });

    test("all clients have config with region property", () => {
      const rds = factory.createClient(RDSClient);
      const s3 = factory.createClient(S3Client);

      // AWS SDK v3 clients have config.region
      // (though it's a lazy-evaluated property that returns function)
      expect(rds.config.region).toBeDefined();
      expect(s3.config.region).toBeDefined();
    });

    test("all clients have credentials provider configured", () => {
      const rds = factory.createClient(RDSClient);
      const s3 = factory.createClient(S3Client);

      // AWS SDK v3 uses functions that return credentials, where the fromIni() provider reads the
      // profile, resolves credentials, and then discards profile name
      expect(rds.config.credentials).toBeDefined();
      expect(s3.config.credentials).toBeDefined();
    });

    test("creates new client instance on each call", () => {
      const client1 = factory.createClient(RDSClient);
      const client2 = factory.createClient(RDSClient);

      expect(client1).not.toBe(client2);
    });
  });
});
