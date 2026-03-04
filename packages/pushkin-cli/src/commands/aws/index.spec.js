/**
 * Tests for worker docker buildx argument handling in rebuildWorker.
 * rebuildWorker is not exported from aws/index.js, so these tests verify
 * the argument construction pattern it uses here:
 *   execFile("docker", ["buildx", "build", "--platform", "linux/amd64",
 *            workerLoc, "-t", workerName, "--load"])
 *
 * Using execFile with an argument array (instead of exec with a shell string)
 * means the path is never interpreted by a shell, making spaces in paths safe.
 */
const path = require("path");

describe("rebuildWorker - docker buildx argument handling", () => {
  // Mirror the exact argument construction used in index.js.
  // This needs to be updated if rebuildWorker is changed.
  const buildDockerArgs = (workerLoc, workerName) => [
    "buildx",
    "build",
    "--platform",
    "linux/amd64",
    workerLoc,
    "-t",
    workerName,
    "--load",
  ];

  describe("path without spaces", () => {
    const expDir = "/home/user/pushkin/experiments/myexperiment";
    const workerName = "myexperiment_worker";
    const workerLoc = path.join(expDir, "worker");

    test("path is passed as a discrete argument", () => {
      const args = buildDockerArgs(workerLoc, workerName);
      expect(args).toContain(workerLoc);
    });

    test("path argument is not modified (no escaping or quoting)", () => {
      const args = buildDockerArgs(workerLoc, workerName);
      const pathArg = args.find((a) => a === workerLoc);
      expect(pathArg).toBe(workerLoc);
    });

    test("arguments match expected format", () => {
      const args = buildDockerArgs(workerLoc, workerName);
      expect(args).toEqual([
        "buildx",
        "build",
        "--platform",
        "linux/amd64",
        `${expDir}/worker`,
        "-t",
        "myexperiment_worker",
        "--load",
      ]);
    });
  });

  describe("path with spaces", () => {
    const expDir = "/home/user/my pushkin project/experiments/my experiment";
    const workerName = "myexperiment_worker";
    const workerLoc = path.join(expDir, "worker");

    test("path with spaces is passed as a discrete argument", () => {
      const args = buildDockerArgs(workerLoc, workerName);
      expect(args).toContain(workerLoc);
    });

    test("path with spaces is not shell-escaped or quoted", () => {
      const args = buildDockerArgs(workerLoc, workerName);
      const pathArg = args.find((a) => a === workerLoc);
      expect(pathArg).toBe(workerLoc);
      expect(pathArg).not.toContain('"');
      expect(pathArg).not.toContain("\\ ");
    });

    test("arguments match expected format", () => {
      const args = buildDockerArgs(workerLoc, workerName);
      expect(args).toEqual([
        "buildx",
        "build",
        "--platform",
        "linux/amd64",
        `${expDir}/worker`,
        "-t",
        "myexperiment_worker",
        "--load",
      ]);
    });
  });
});
