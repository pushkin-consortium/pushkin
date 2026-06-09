import fs from "graceful-fs";
import jsYaml from "js-yaml";
import {
  loadAwsConfig,
  getDefaultAwsConfig,
  validateAwsConfig,
  generateAwsConfig,
} from "../aws-config.js";

jest.mock("graceful-fs");

beforeEach(() => jest.clearAllMocks());

describe("loadAwsConfig", () => {
  test("returns defaults when aws-deploy.yaml does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    const config = loadAwsConfig();

    expect(config.region).toBe("us-east-1");
    expect(config.cloudfront.priceClass).toBe("PriceClass_100");
    expect(config.ecs.api.memory).toBe(512);
  });

  test("merges user config over defaults", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump({ region: "eu-west-1" }));

    const config = loadAwsConfig();

    expect(config.region).toBe("eu-west-1");
    expect(config.cloudfront.priceClass).toBeDefined(); // defaults preserved
  });

  test("deep merges nested user config without clobbering siblings", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump({ ecs: { api: { memory: 1024 } } }));

    const config = loadAwsConfig();

    expect(config.ecs.api.memory).toBe(1024); // overridden
    expect(config.ecs.api.cpu).toBe(256); // default preserved
    expect(config.ecs.worker.memory).toBe(512); // sibling default preserved
  });

  test("accepts an explicit config path", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump({ region: "ap-northeast-1" }));

    const config = loadAwsConfig("/custom/path/aws-deploy.yaml");

    expect(fs.existsSync).toHaveBeenCalledWith("/custom/path/aws-deploy.yaml");
    expect(config.region).toBe("ap-northeast-1");
  });

  test("returns defaults silently when file is all comments (parses to null)", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("# just a comment");
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const config = loadAwsConfig();

    expect(config.region).toBe("us-east-1");
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("returns defaults with a warning when file content is not a YAML object", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(jsYaml.dump("just a string")); // valid YAML, but not an object
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const config = loadAwsConfig();

    expect(config.region).toBe("us-east-1");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("not a valid YAML object"));
    warnSpy.mockRestore();
  });

  test("returns defaults when file read throws", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const config = loadAwsConfig();

    expect(config.region).toBe("us-east-1");
  });
});

describe("getDefaultAwsConfig", () => {
  test("returns a copy — mutating top-level fields does not affect subsequent calls", () => {
    const config = getDefaultAwsConfig();
    config.region = "mutated";

    expect(getDefaultAwsConfig().region).toBe("us-east-1");
  });

  test("returns a deep copy — mutating nested fields does not affect subsequent calls", () => {
    const config = getDefaultAwsConfig();
    config.ecs.api.memory = 9999;

    expect(getDefaultAwsConfig().ecs.api.memory).toBe(512);
  });
});

describe("validateAwsConfig", () => {
  test("returns no errors for the default config", () => {
    expect(validateAwsConfig(getDefaultAwsConfig())).toEqual([]);
  });

  test("rejects an invalid region", () => {
    const config = { ...getDefaultAwsConfig(), region: "mars-east-1" };
    const errors = validateAwsConfig(config);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/region/);
  });

  test("rejects minSize greater than maxSize", () => {
    const config = {
      ...getDefaultAwsConfig(),
      autoscaling: { minSize: 10, maxSize: 2, desiredCapacity: 5 },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((e) => e.includes("minSize"))).toBe(true);
  });

  test("rejects desiredCapacity outside min/max range", () => {
    const config = {
      ...getDefaultAwsConfig(),
      autoscaling: { minSize: 2, maxSize: 10, desiredCapacity: 20 },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((e) => e.includes("desiredCapacity"))).toBe(true);
  });

  test("rejects memoryReservation exceeding memory for an ECS service", () => {
    const config = {
      ...getDefaultAwsConfig(),
      ecs: {
        ...getDefaultAwsConfig().ecs,
        api: { memory: 256, memoryReservation: 512, cpu: 256 },
      },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((e) => e.includes("ecs.api.memoryReservation"))).toBe(true);
  });

  test("rejects an invalid CloudFront price class", () => {
    const config = {
      ...getDefaultAwsConfig(),
      cloudfront: { ...getDefaultAwsConfig().cloudfront, priceClass: "PriceClass_Free" },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((e) => e.includes("priceClass"))).toBe(true);
  });

  test("rejects zero or negative ECS memory or cpu", () => {
    const config = {
      ...getDefaultAwsConfig(),
      ecs: {
        ...getDefaultAwsConfig().ecs,
        worker: { memory: 0, memoryReservation: 0, cpu: -1 },
      },
    };
    const errors = validateAwsConfig(config);

    expect(errors.some((e) => e.includes("ecs.worker.memory"))).toBe(true);
    expect(errors.some((e) => e.includes("ecs.worker.cpu"))).toBe(true);
  });
});

describe("deepMerge (via loadAwsConfig)", () => {
  test("user-specified arrays replace defaults rather than merge", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(
      jsYaml.dump({ security: { adminIPWhitelist: ["203.0.113.0/24"] } }),
    );

    const config = loadAwsConfig();

    expect(config.security.adminIPWhitelist).toEqual(["203.0.113.0/24"]);
  });
});

describe("generateAwsConfig", () => {
  test("writes a template file when aws-deploy.yaml does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    generateAwsConfig();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("aws-deploy.yaml"),
      expect.stringContaining("region"),
      "utf8",
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

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test("respects an explicit config path", () => {
    fs.existsSync.mockReturnValue(false);

    generateAwsConfig("/custom/path/aws-deploy.yaml");

    expect(fs.existsSync).toHaveBeenCalledWith("/custom/path/aws-deploy.yaml");
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/custom/path/aws-deploy.yaml",
      expect.any(String),
      "utf8",
    );
  });
});
