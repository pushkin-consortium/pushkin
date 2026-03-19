/**
 * Unit tests for retry utilities
 */

import { retryWithBackoff, retryWithConstantDelay, retryImmediate } from "../../../utils/retry.js";

describe("retryWithBackoff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("success");
    const result = await retryWithBackoff(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries on failure and eventually succeeds", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("ThrottlingException"))
      .mockRejectedValueOnce(new Error("ThrottlingException"))
      .mockResolvedValue("success");

    const result = await retryWithBackoff(fn, { initialDelay: 10 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("throws after max retries exhausted", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn, { maxRetries: 2, initialDelay: 10 })).rejects.toThrow(
      "ThrottlingException",
    );

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  test("does not retry non-retryable errors", async () => {
    const error = new Error("NotRetryable");
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      retryWithBackoff(fn, {
        shouldRetry: () => false,
        initialDelay: 10,
      }),
    ).rejects.toThrow("NotRetryable");

    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });

  test("uses custom shouldRetry function", async () => {
    const error = new Error("CustomError");
    error.name = "CustomError";
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 2,
        shouldRetry: (err) => err.name === "CustomError",
        initialDelay: 10,
      }),
    ).rejects.toThrow("CustomError");

    expect(fn).toHaveBeenCalledTimes(3); // Retries because shouldRetry returns true
  });

  test("calls onRetry callback", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

    const onRetry = jest.fn();

    await retryWithBackoff(fn, {
      initialDelay: 10,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, error, expect.any(Number));
  });

  test("implements exponential backoff", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("success");

    const delays = [];
    const onRetry = jest.fn((attempt, err, delay) => {
      delays.push(delay);
    });

    await retryWithBackoff(fn, {
      initialDelay: 100,
      backoffFactor: 2,
      onRetry,
    });

    // Delays should increase exponentially: 100, 200
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
  });

  test("respects maxDelay cap", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("success");

    const delays = [];
    const onRetry = jest.fn((attempt, err, delay) => {
      delays.push(delay);
    });

    await retryWithBackoff(fn, {
      initialDelay: 100,
      backoffFactor: 10,
      maxDelay: 150,
      onRetry,
    });

    // Second delay should be capped at maxDelay
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(150); // Capped from 1000
  });

  test("handles common AWS throttling errors", async () => {
    const throttlingErrors = [
      { name: "ThrottlingException" },
      { name: "RequestLimitExceeded" },
      { name: "TooManyRequestsException" },
      { statusCode: 429 },
      { statusCode: 503 },
    ];

    for (const errorProps of throttlingErrors) {
      const error = new Error("Test error");
      Object.assign(error, errorProps);

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

      await retryWithBackoff(fn, { initialDelay: 10 });

      expect(fn).toHaveBeenCalledTimes(2); // Retried once
      jest.clearAllMocks();
    }
  });
});

describe("retryWithConstantDelay", () => {
  test("uses constant delay between retries", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue("success");

    const delays = [];
    const onRetry = jest.fn((attempt, err, delay) => {
      delays.push(delay);
    });

    await retryWithConstantDelay(fn, {
      delay: 100,
      onRetry,
    });

    // All delays should be the same
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(100);
  });

  test("works with shouldRetry function", async () => {
    const error = new Error("OriginAccessControlInUse");
    error.name = "OriginAccessControlInUse";

    const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

    const result = await retryWithConstantDelay(fn, {
      delay: 10,
      shouldRetry: (err) => err.name === "OriginAccessControlInUse",
    });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("retryImmediate", () => {
  test("retries immediately without delay", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

    const startTime = Date.now();
    await retryImmediate(fn);
    const duration = Date.now() - startTime;

    // Should complete almost immediately (< 50ms)
    expect(duration).toBeLessThan(50);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("has lower default maxRetries", async () => {
    const error = new Error("ThrottlingException");
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retryImmediate(fn)).rejects.toThrow();

    // Default is 3 for immediate (less aggressive)
    expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });
});
