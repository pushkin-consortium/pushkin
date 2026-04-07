import { fromIni } from "@aws-sdk/credential-providers";

/**
 * AWS Client Factory
 * Centralized factory for creating AWS SDK v3 clients with consistent configuration.
 *
 * Configures AWS SDK v3 built-in retry with adaptive mode:
 * - Adaptive retry mode learns from throttling responses and adjusts retry behavior
 * - Handles transient errors (500s, 503s, timeouts) automatically
 * - Implements exponential backoff with jitter to prevent thundering herd
 * - Max 5 attempts (1 initial + 4 retries) for reliability
 * @see https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
 * @see https://docs.aws.amazon.com/sdkref/latest/guide/feature-adaptive-retry.html
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
   *
   * Retry configuration:
   * - maxAttempts: 5 (1 initial + 4 retries)
   * - retryMode: "adaptive" - learns from rate limiting and adjusts behavior
   *
   * The SDK automatically retries:
   * - Transient errors (500, 503, 504)
   * - Throttling errors (400 with ThrottlingException, TooManyRequestsException, etc.)
   * - Connection errors (timeouts, network failures)
   *
   * For resource state polling (waiting for resources to be ready), use custom
   * polling logic rather than relying on SDK retry - those are application-level
   * concerns, not transient failures.
   */
  createClient(ClientClass) {
    return new ClientClass({
      region: this.region,
      credentials: this.credentials,
      maxAttempts: 5, // Total attempts: 1 initial + 4 retries
      retryMode: "adaptive", // Adaptive retry learns from throttling
    });
  }
}
