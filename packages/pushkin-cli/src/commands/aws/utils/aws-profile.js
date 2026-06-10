/**
 * AWS profile management utilities for Pushkin CLI.
 * This module holds the active AWS IAM profile in memory, which is set by initAwsProfile and accessed by getAwsProfile.
 * @module aws/utils/aws-profile
 */

let profile;

const initAwsProfile = (name) => {
  profile = name;
};

const getAwsProfile = () => {
  if (!profile) throw new Error("AWS profile not initialized. Call initAwsProfile first.");
  return profile;
};

export { initAwsProfile, getAwsProfile };
