// Module-level singleton: IAM profile is set once by initAwsProfile() at startup and read throughout.
let profile;

const initAwsProfile = (name) => {
  profile = name;
};

const getAwsProfile = () => {
  if (!profile) throw new Error("AWS profile not initialized. Call initAwsProfile first.");
  return profile;
};

export { initAwsProfile, getAwsProfile };
