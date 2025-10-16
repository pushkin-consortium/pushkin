import { fromIni } from "@aws-sdk/credential-providers";

/**
 * AWS Client Factory
 *
 * Centralized factory for creating AWS SDK v3 clients with consistent configuration.
 * @example
 * import { RDSClient } from "@aws-sdk/client-rds";
 * import { S3Client } from "@aws-sdk/client-s3";
 *
 * const factory = new AWSClientFactory('us-east-1', 'my-profile');
 * const rds = factory.createClient(RDSClient);
 * const s3 = factory.createClient(S3Client);
 */
export class AWSClientFactory {
  /**
   * Create a new AWS Client Factory
   * @param {string} region - AWS region (e.g., 'us-east-1')
   * @param {string} profileName - IAM profile name (e.g., 'default')
   */
  constructor(region, profileName) {
    this.region = region;
    this.profileName = profileName;
    this.credentials = fromIni({ profile: profileName });
  }

  /**
   * Create any AWS SDK v3 client with consistent configuration
   * @param {Function} ClientClass - AWS SDK client class (e.g., RDSClient, S3Client)
   * @returns {Object} Configured client instance
   *
   * @example
   * import { RDSClient } from "@aws-sdk/client-rds";
   * const rds = factory.createClient(RDSClient);
   */
  createClient(ClientClass) {
    return new ClientClass({
      region: this.region,
      credentials: this.credentials,
    });
  }
}
