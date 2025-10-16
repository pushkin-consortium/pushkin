/**
 * AWS Client Factory
 *
 * Centralized factory for creating AWS SDK v3 clients with consistent configuration.
 * Provides a single source of truth for client instantiation, making it easy to:
 * - Mock clients in tests
 * - Add middleware (logging, retry logic, etc.)
 * - Change configuration globally
 *
 * @example
 * const factory = new AWSClientFactory('us-east-1', { iam: 'my-profile' });
 * const rds = factory.createRDS();
 * const s3 = factory.createS3();
 */

import { fromIni } from "@aws-sdk/credential-providers";
import { RDSClient } from "@aws-sdk/client-rds";
import { S3Client } from "@aws-sdk/client-s3";
import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { Route53Client } from "@aws-sdk/client-route-53";
import { Route53DomainsClient } from "@aws-sdk/client-route-53-domains";
import { ECSClient } from "@aws-sdk/client-ecs";
import { EC2Client } from "@aws-sdk/client-ec2";
import { IAMClient } from "@aws-sdk/client-iam";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { CloudWatchLogsClient } from "@aws-sdk/client-cloudwatch-logs";
import { WAFV2Client } from "@aws-sdk/client-wafv2";
import { STSClient } from "@aws-sdk/client-sts";
import { ACMClient } from "@aws-sdk/client-acm";

export class AWSClientFactory {
  /**
   * Create a new AWS Client Factory
   *
   * @param {string} region - AWS region (e.g., 'us-east-1')
   * @param {Object|string} iamProfile - IAM profile to use. Can be:
   *   - String: profile name (e.g., 'default')
   *   - Object: { iam: 'profile-name' }
   *   This flexibility handles inconsistencies in the existing codebase.
   */
  constructor(region, iamProfile) {
    this.region = region;

    // Normalize iamProfile to handle both string and object formats
    // Some parts of codebase pass string, others pass { iam: 'string' }
    if (typeof iamProfile === 'string') {
      this.profileName = iamProfile;
    } else if (iamProfile && typeof iamProfile === 'object' && iamProfile.iam) {
      this.profileName = iamProfile.iam;
    } else {
      throw new Error('iamProfile must be a string or object with .iam property');
    }

    // Reusable credential provider
    this.credentials = fromIni({ profile: this.profileName });
  }

  /**
   * Get base client configuration
   * @private
   */
  _getBaseConfig() {
    return {
      region: this.region,
      credentials: this.credentials,
    };
  }

  /**
   * Create RDS client for database operations
   * @returns {RDSClient}
   */
  createRDS() {
    return new RDSClient(this._getBaseConfig());
  }

  /**
   * Create S3 client for object storage operations
   * @returns {S3Client}
   */
  createS3() {
    return new S3Client(this._getBaseConfig());
  }

  /**
   * Create Elastic Load Balancing v2 client for ALB/NLB operations
   * @returns {ElasticLoadBalancingV2Client}
   */
  createELBv2() {
    return new ElasticLoadBalancingV2Client(this._getBaseConfig());
  }

  /**
   * Create CloudFront client for CDN operations
   * @returns {CloudFrontClient}
   */
  createCloudFront() {
    return new CloudFrontClient(this._getBaseConfig());
  }

  /**
   * Create Route53 client for DNS operations
   * @returns {Route53Client}
   */
  createRoute53() {
    return new Route53Client(this._getBaseConfig());
  }

  /**
   * Create Route53 Domains client for domain registration
   * @returns {Route53DomainsClient}
   */
  createRoute53Domains() {
    return new Route53DomainsClient(this._getBaseConfig());
  }

  /**
   * Create ECS client for container orchestration
   * @returns {ECSClient}
   */
  createECS() {
    return new ECSClient(this._getBaseConfig());
  }

  /**
   * Create EC2 client for compute/networking operations
   * @returns {EC2Client}
   */
  createEC2() {
    return new EC2Client(this._getBaseConfig());
  }

  /**
   * Create IAM client for identity and access management
   * @returns {IAMClient}
   */
  createIAM() {
    return new IAMClient(this._getBaseConfig());
  }

  /**
   * Create CloudFormation client for infrastructure as code
   * @returns {CloudFormationClient}
   */
  createCloudFormation() {
    return new CloudFormationClient(this._getBaseConfig());
  }

  /**
   * Create CloudWatch Logs client for log management
   * @returns {CloudWatchLogsClient}
   */
  createCloudWatchLogs() {
    return new CloudWatchLogsClient(this._getBaseConfig());
  }

  /**
   * Create WAFv2 client for web application firewall
   * @returns {WAFV2Client}
   */
  createWAFv2() {
    return new WAFV2Client(this._getBaseConfig());
  }

  /**
   * Create STS client for security token service (identity verification)
   * @returns {STSClient}
   */
  createSTS() {
    return new STSClient(this._getBaseConfig());
  }

  /**
   * Create ACM client for certificate management
   * @returns {ACMClient}
   */
  createACM() {
    return new ACMClient(this._getBaseConfig());
  }

  /**
   * Get the profile name being used
   * @returns {string}
   */
  getProfileName() {
    return this.profileName;
  }

  /**
   * Get the region being used
   * @returns {string}
   */
  getRegion() {
    return this.region;
  }
}