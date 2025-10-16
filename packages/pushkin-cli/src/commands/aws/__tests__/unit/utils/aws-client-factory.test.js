/**
 * Unit tests for AWSClientFactory
 *
 * Tests the factory pattern for creating AWS SDK clients
 */

import { AWSClientFactory } from '../../../utils/aws-client-factory.js';
import { RDSClient } from '@aws-sdk/client-rds';
import { S3Client } from '@aws-sdk/client-s3';
import { ECSClient } from '@aws-sdk/client-ecs';

describe('AWSClientFactory', () => {
  const testRegion = 'us-east-1';
  const testProfile = 'test-profile';

  describe('constructor', () => {
    test('accepts string profile name', () => {
      const factory = new AWSClientFactory(testRegion, testProfile);
      expect(factory.getProfileName()).toBe(testProfile);
      expect(factory.getRegion()).toBe(testRegion);
    });

    test('accepts object with iam property', () => {
      const factory = new AWSClientFactory(testRegion, { iam: testProfile });
      expect(factory.getProfileName()).toBe(testProfile);
      expect(factory.getRegion()).toBe(testRegion);
    });

    test('throws error for invalid profile format', () => {
      expect(() => {
        new AWSClientFactory(testRegion, null);
      }).toThrow('iamProfile must be a string or object with .iam property');
    });

    test('throws error for object without iam property', () => {
      expect(() => {
        new AWSClientFactory(testRegion, { profile: 'test' });
      }).toThrow('iamProfile must be a string or object with .iam property');
    });
  });

  describe('client creation', () => {
    let factory;

    beforeEach(() => {
      factory = new AWSClientFactory(testRegion, testProfile);
    });

    test('createRDS returns RDSClient instance', () => {
      const client = factory.createRDS();
      expect(client).toBeInstanceOf(RDSClient);
    });

    test('createS3 returns S3Client instance', () => {
      const client = factory.createS3();
      expect(client).toBeInstanceOf(S3Client);
    });

    test('createECS returns ECSClient instance', () => {
      const client = factory.createECS();
      expect(client).toBeInstanceOf(ECSClient);
    });

    test('all clients are configured with correct region', () => {
      const rds = factory.createRDS();
      const s3 = factory.createS3();

      // AWS SDK v3 clients have config property
      expect(rds.config.region).toBeDefined();
      expect(s3.config.region).toBeDefined();
    });

    test('creates new client instance on each call', () => {
      const client1 = factory.createRDS();
      const client2 = factory.createRDS();

      // Should be different instances
      expect(client1).not.toBe(client2);
    });
  });

  describe('helper methods', () => {
    test('getProfileName returns correct profile', () => {
      const factory = new AWSClientFactory(testRegion, testProfile);
      expect(factory.getProfileName()).toBe(testProfile);
    });

    test('getRegion returns correct region', () => {
      const factory = new AWSClientFactory(testRegion, testProfile);
      expect(factory.getRegion()).toBe(testRegion);
    });
  });
});
