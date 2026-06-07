import { fromIni } from "@aws-sdk/credential-providers";
import { AWS_REGION } from "../constants.js";
import { getAwsProfile } from "./aws-profile.js";

/**
 * AWS Client Factory
 * Centralized factory for creating AWS SDK v3 clients using the configured region and IAM profile.
 */
class AwsClientFactory {
  /**
   * Create a new client factory.
   * @param {string} [region]
   */
  constructor(region = AWS_REGION) {
    this.region = region;
    this.profileName = getAwsProfile();
    this.credentials = fromIni({ profile: this.profileName });
  }

  /**
   * Create any AWS SDK v3 client.
   * @param {Function} ClientClass
   * @returns {object} Client instance with configured region and credentials
   */
  createClient(ClientClass) {
    return new ClientClass({
      region: this.region,
      credentials: this.credentials,
      maxAttempts: 5,
      retryMode: "adaptive", // Use adaptive retry mode for better handling of throttling
    });
  }
}

export { AwsClientFactory };
