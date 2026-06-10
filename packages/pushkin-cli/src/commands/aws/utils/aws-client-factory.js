import { fromIni } from "@aws-sdk/credential-providers";
import { AWS_REGION } from "../constants.js";
import { getAwsProfile } from "./aws-profile.js";

class AwsClientFactory {
  constructor(region = AWS_REGION) {
    this.region = region;
    this.profileName = getAwsProfile();
    this.credentials = fromIni({ profile: this.profileName });
  }

  createClient(ClientClass) {
    return new ClientClass({
      region: this.region,
      credentials: this.credentials,
      maxAttempts: 5,
      retryMode: "adaptive", // Use adaptive retry mode for better handling of throttling
    });
  }
}

export { AwsClientFactory };
