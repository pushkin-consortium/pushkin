import fs from "graceful-fs";
import jsYaml from "js-yaml";
import {
  getAwsConfigPath,
  generateAwsConfig,
  loadAwsConfig,
  validateAwsConfig,
} from "../aws-config.js";

jest.mock("graceful-fs");
jest.mock("../../../../utils/pushkin-config.js", () => ({
  getProjectRoot: jest.fn(() => "/project"),
}));

beforeEach(() => jest.clearAllMocks());

// Matches the defaults in aws-deploy.yaml
const VALID_CONFIG = {
  region: "us-east-1",
  cloudfront: { priceClass: "PriceClass_100", extraConfig: {} },
  ecs: {
    api: { memory: 512 },
    worker: { memory: 512 },
    rabbitmq: { memory: 512 },
    extraConfig: {},
  },
  rds: {
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    maxAllocatedStorage: 100,
    backupRetentionPeriod: 7,
    multiAZ: false,
    extraConfig: {},
  },
  autoscaling: {
    minSize: 2,
    maxSize: 10,
    desiredCapacity: 2,
    alarms: {
      cpu: { threshold: 75, evaluationPeriods: 2 },
      memory: { threshold: 75, evaluationPeriods: 2 },
      rds: { writeLatency: 100, evaluationPeriods: 2 },
    },
  },
  security: { enableWAF: false },
  monitoring: { logRetentionDays: 7 },
};

describe("getAwsConfigPath", () => {
  test("returns path when aws-deploy.yaml exists in current directory", () => {
    fs.existsSync.mockImplementation((filePath) => filePath.endsWith("aws-deploy.yaml"));
    const result = getAwsConfigPath();
    expect(result).toContain("aws-deploy.yaml");
  });

  test("walks up to find aws-deploy.yaml in a parent directory", () => {
    const parentPath = "/parent/aws-deploy.yaml";
    fs.existsSync.mockImplementation((filePath) => filePath === parentPath);

    const originalCwd = process.cwd;
    process.cwd = () => "/parent/child";

    const result = getAwsConfigPath();

    expect(result).toBe(parentPath);
    process.cwd = originalCwd;
  });

  test("throws with a helpful message when no aws-deploy.yaml is found", () => {
    fs.existsSync.mockReturnValue(false);
    expect(() => getAwsConfigPath()).toThrow("pushkin aws init");
  });
});

describe("generateAwsConfig", () => {
  test("copies the template into the project root when no path is given", () => {
    fs.existsSync.mockReturnValue(false);

    generateAwsConfig();

    expect(fs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining("aws-deploy.yaml"),
      "/project/aws-deploy.yaml",
    );
  });

  test("logs a message when the file is created", () => {
    fs.existsSync.mockReturnValue(false);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    generateAwsConfig();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("aws-deploy.yaml"));
    consoleSpy.mockRestore();
  });

  test("does not overwrite an existing aws-deploy.yaml", () => {
    fs.existsSync.mockReturnValue(true);

    generateAwsConfig();

    expect(fs.copyFileSync).not.toHaveBeenCalled();
  });

  test("respects an explicit destination path", () => {
    fs.existsSync.mockReturnValue(false);

    generateAwsConfig("/custom/path/aws-deploy.yaml");

    expect(fs.existsSync).toHaveBeenCalledWith("/custom/path/aws-deploy.yaml");
    expect(fs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining("aws-deploy.yaml"),
      "/custom/path/aws-deploy.yaml",
    );
  });
});

describe("loadAwsConfig", () => {
  test("returns parsed config when aws-deploy.yaml is valid", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump(VALID_CONFIG));

    const config = loadAwsConfig();

    expect(config.region).toBe("us-east-1");
    expect(config.cloudfront.priceClass).toBe("PriceClass_100");
    expect(config.ecs.api.memory).toBe(512);
  });

  test("throws when aws-deploy.yaml does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    expect(() => loadAwsConfig()).toThrow("pushkin aws init");
  });

  test("throws when file parses to null (empty or all comments)", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("# just a comment");

    expect(() => loadAwsConfig()).toThrow("empty or not a valid YAML object");
  });

  test("throws when file content is not a YAML object", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump("just a string"));

    expect(() => loadAwsConfig()).toThrow("empty or not a valid YAML object");
  });

  test("throws when file content is a YAML array", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump(["item1", "item2"]));

    expect(() => loadAwsConfig()).toThrow("empty or not a valid YAML object");
  });

  test("throws with a YAML error message when file contains invalid YAML", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("key: [unclosed");

    expect(() => loadAwsConfig()).toThrow("Invalid YAML");
  });

  test("throws when file cannot be read", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    expect(() => loadAwsConfig()).toThrow("Permission denied");
  });
});

describe("validateAwsConfig", () => {
  test("returns no errors for the default config", () => {
    expect(validateAwsConfig(VALID_CONFIG)).toEqual([]);
  });

  test("rejects an invalid region", () => {
    const config = { ...VALID_CONFIG, region: "mars-east-1" };
    const errors = validateAwsConfig(config);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/region/);
  });

  test("rejects minSize greater than maxSize", () => {
    const config = {
      ...VALID_CONFIG,
      autoscaling: { ...VALID_CONFIG.autoscaling, minSize: 10, maxSize: 2, desiredCapacity: 5 },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((error) => error.includes("minSize"))).toBe(true);
  });

  test("rejects desiredCapacity above maxSize", () => {
    const config = {
      ...VALID_CONFIG,
      autoscaling: { ...VALID_CONFIG.autoscaling, minSize: 2, maxSize: 10, desiredCapacity: 20 },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((error) => error.includes("desiredCapacity"))).toBe(true);
  });

  test("rejects desiredCapacity below minSize", () => {
    const config = {
      ...VALID_CONFIG,
      autoscaling: { ...VALID_CONFIG.autoscaling, minSize: 5, maxSize: 10, desiredCapacity: 1 },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((error) => error.includes("desiredCapacity"))).toBe(true);
  });

  test("rejects an invalid CloudFront price class", () => {
    const config = {
      ...VALID_CONFIG,
      cloudfront: { ...VALID_CONFIG.cloudfront, priceClass: "PriceClass_Free" },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((error) => error.includes("priceClass"))).toBe(true);
  });

  test.each(["api", "worker", "rabbitmq"])(
    "rejects zero or negative ECS memory for %s",
    (service) => {
      const config = {
        ...VALID_CONFIG,
        ecs: { ...VALID_CONFIG.ecs, [service]: { memory: 0 } },
      };
      const errors = validateAwsConfig(config);

      expect(errors.some((error) => error.includes(`ecs.${service}.memory`))).toBe(true);
    },
  );
});
