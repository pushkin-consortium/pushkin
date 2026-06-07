import { AwsClientFactory } from "../aws-client-factory.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { WAFV2Client } from "@aws-sdk/client-wafv2";
import { RDSClient } from "@aws-sdk/client-rds";
import { S3Client } from "@aws-sdk/client-s3";
import { ECSClient } from "@aws-sdk/client-ecs";

jest.mock("../aws-profile.js", () => ({ getAwsProfile: () => "test-profile" }));
jest.mock("../../constants.js", () => ({ AWS_REGION: "eu-west-1", PROJECT_TAG_KEY: "PUSHKIN" }));

describe("AwsClientFactory", () => {
  describe("constructor", () => {
    test("defaults to AWS_REGION when no region specified", () => {
      const factory = new AwsClientFactory();
      expect(factory.region).toBe("eu-west-1");
    });

    test("uses explicit region override when provided", () => {
      const factory = new AwsClientFactory("us-east-1");
      expect(factory.region).toBe("us-east-1");
    });

    test("reads profile from aws-profile", () => {
      const factory = new AwsClientFactory();
      expect(factory.profileName).toBe("test-profile");
    });
  });

  describe("client creation", () => {
    let factory;

    beforeEach(() => {
      factory = new AwsClientFactory();
    });

    test("createClient returns CloudFrontClient instance", () => {
      expect(factory.createClient(CloudFrontClient)).toBeInstanceOf(CloudFrontClient);
    });

    test("createClient returns ECSClient instance", () => {
      expect(factory.createClient(ECSClient)).toBeInstanceOf(ECSClient);
    });

    test("createClient returns RDSClient instance", () => {
      expect(factory.createClient(RDSClient)).toBeInstanceOf(RDSClient);
    });

    test("createClient returns S3Client instance", () => {
      expect(factory.createClient(S3Client)).toBeInstanceOf(S3Client);
    });

    test("all clients have region and credentials configured", () => {
      const rds = factory.createClient(RDSClient);
      const s3 = factory.createClient(S3Client);

      expect(rds.config.region).toBeDefined();
      expect(s3.config.region).toBeDefined();
      expect(rds.config.credentials).toBeDefined();
      expect(s3.config.credentials).toBeDefined();
    });

    test("region override propagates to created client instance", () => {
      const wafFactory = new AwsClientFactory("us-east-1");
      expect(wafFactory.createClient(WAFV2Client)).toBeInstanceOf(WAFV2Client);
      expect(wafFactory.region).toBe("us-east-1");
    });

    test("creates new client instance on each call", () => {
      const client1 = factory.createClient(RDSClient);
      const client2 = factory.createClient(RDSClient);

      expect(client1).not.toBe(client2);
    });
  });
});
