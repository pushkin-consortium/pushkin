import { fromIni } from "@aws-sdk/credential-providers";

/**
 * AWS Client Factory
 * Centralized factory for creating AWS SDK v3 clients with consistent configuration.
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
   * @returns {object} Configured client instance
   */
  createClient(ClientClass) {
    return new ClientClass({
      region: this.region,
      credentials: this.credentials,
    });
  }
}
