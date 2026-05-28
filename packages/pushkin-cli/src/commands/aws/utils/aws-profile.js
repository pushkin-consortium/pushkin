let profile;

export const initAwsProfile = (name) => {
  profile = name;
};

export const getAwsProfile = () => {
  if (!profile) throw new Error("AWS profile not initialized — call initAwsProfile first");
  return profile;
};
