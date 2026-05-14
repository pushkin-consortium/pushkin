/**
 * Retry Utility
 *
 * Provides generic retry logic with exponential backoff for AWS operations.
 * Useful for handling transient errors like rate limiting, resource locks, etc.
 * @example
 * // Simple retry
 * await retryWithBackoff(() => client.send(command));
 *
 * // Custom retry logic
 * await retryWithBackoff(
 *   () => cloudfront.deleteOAC(id),
 *   {
 *     maxRetries: 10,
 *     shouldRetry: (error) => error.name === 'OriginAccessControlInUse',
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}...`)
 *   }
 * );
 */

/**
 * Function that checks error against list of default retryable AWS errors
 * WHY: 
 */
function defaultShouldRetry(error) {
  // Common retryable AWS errors
  const retryableErrors = [
    "ThrottlingException",
    "RequestLimitExceeded",
    "TooManyRequestsException",
    "ProvisionedThroughputExceededException",
    "RequestThrottled",
    "ServiceUnavailable",
    "InternalError",
    "ResourceInUseException",
    "OriginAccessControlInUse",
  ];

  return (
    retryableErrors.includes(error.name) ||
    error.message?.includes("throttle") ||
    error.message?.includes("rate limit") ||
    error.statusCode === 429 ||
    error.statusCode === 503 ||
    error.statusCode === 504
  );
}

/**
 * Retry a function with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} [options.maxRetries=5] - Maximum number of retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in milliseconds
 * @param {number} [options.maxDelay=30000] - Maximum delay in milliseconds
 * @param {number} [options.backoffFactor=2] - Multiplier for exponential backoff
 * @param {Function} [options.shouldRetry] - Function to determine if error is retryable
 * @param {Function} [options.onRetry] - Callback called before each retry (attempt, error) => void
 * @returns {Promise<*>} - Result of the function
 * @throws {Error} - Last error if all retries exhausted
 * @example
 * const result = await retryWithBackoff(
 *   async () => {
 *     return await client.send(command);
 *   },
 *   {
 *     maxRetries: 3,
 *     shouldRetry: (err) => err.name === 'ThrottlingException',
 *     onRetry: (attempt) => console.log(`Retrying attempt ${attempt}...`)
 *   }
 * );
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = defaultShouldRetry,
    onRetry = null,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Try to execute the function
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = shouldRetry(error);

      if (!isRetryable || isLastAttempt) {
        // Don't retry - either not retryable or out of attempts
        throw error;
      }

      // Calculate delay with exponential backoff
      const currentDelay = Math.min(delay, maxDelay);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, currentDelay);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      // Increase delay for next retry (exponential backoff)
      delay *= backoffFactor;
    }
  }

  // Should never reach here, but throw last error just in case
  throw lastError;
}

/**
 * Retry with constant delay (no exponential backoff)
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} [options.maxRetries=5] - Maximum number of retry attempts
 * @param {number} [options.delay=1000] - Delay between retries in milliseconds
 * @param {Function} [options.shouldRetry] - Function to determine if error is retryable
 * @param {Function} [options.onRetry] - Callback called before each retry
 * @returns {Promise<*>} - Result of the function
 * @throws {Error} - Last error if all retries exhausted
 *
 * @example
 * // Useful for resource locks that release after fixed time
 * await retryWithConstantDelay(
 *   () => deleteResource(id),
 *   {
 *     maxRetries: 10,
 *     delay: 10000, // Wait 10s between each retry
 *     shouldRetry: (err) => err.name === 'ResourceInUse'
 *   }
 * );
 */
async function retryWithConstantDelay(fn, options = {}) {
  const {
    maxRetries = 5,
    delay = 1000,
    shouldRetry = defaultShouldRetry,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxRetries;
      const isRetryable = shouldRetry(error);

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Retry immediately (no delay) - useful for quick operations
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} [options.maxRetries=3] - Maximum number of retry attempts
 * @param {Function} [options.shouldRetry] - Function to determine if error is retryable
 * @returns {Promise<*>} - Result of the function
 * @throws {Error} - Last error if all retries exhausted
 */
async function retryImmediate(fn, options = {}) {
  const { maxRetries = 3, shouldRetry = defaultShouldRetry } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxRetries;
      const isRetryable = shouldRetry(error);

      if (!isRetryable || isLastAttempt) {
        throw error;
      }
    }
  }

  throw lastError;
}

// Export functions
export { retryWithBackoff, retryWithConstantDelay, retryImmediate };
