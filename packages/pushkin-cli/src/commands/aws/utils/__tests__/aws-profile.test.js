describe("aws-profile", () => {
  let initAwsProfile, getAwsProfile;

  // Cannot import at the top level because aws-profile.js uses module-level state to store the profile, so we need to reset the module before each test
  beforeEach(() => {
    jest.resetModules();
    ({ initAwsProfile, getAwsProfile } = require("../aws-profile.js"));
  });

  test("getAwsProfile throws before initAwsProfile is called", () => {
    expect(() => getAwsProfile()).toThrow(
      "AWS profile not initialized. Call initAwsProfile first.",
    );
  });

  test("getAwsProfile returns the profile after initAwsProfile", () => {
    initAwsProfile("my-profile");
    expect(getAwsProfile()).toBe("my-profile");
  });

  test("initAwsProfile can update the profile", () => {
    initAwsProfile("profile-a");
    initAwsProfile("profile-b");
    expect(getAwsProfile()).toBe("profile-b");
  });

  test("getAwsProfile throws when initAwsProfile was called with an empty string", () => {
    initAwsProfile("");
    expect(() => getAwsProfile()).toThrow("AWS profile not initialized");
  });
});
