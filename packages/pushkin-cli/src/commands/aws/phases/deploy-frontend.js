/**
 * Frontend Deployment Phase
 * Deploys the built React front-end to S3 and CloudFront
 * @module aws/phases/deploy-frontend
 */

import { getOac } from "../services/cloudfront/oac.js";
import {
  ensureDistribution,
  waitForCloudFrontDeployment,
} from "../services/cloudfront/distributions.js";
import { getAcl } from "../services/security.js";
import { ensureBucket, setBucketPolicy, syncS3 } from "../services/s3.js";
import { makeRecordSet } from "../services/route53.js";

/**
 * Deploy the front-end to S3 and CloudFront.
 * Creates an S3 bucket (private), a CloudFront distribution backed by that bucket via an OAC, sets
 * the bucket policy, and creates Route53 DNS records if a custom domain is configured.
 * @param {object} options
 * @param {string} options.s3BucketName - The S3 bucket name (sanitized, globally unique, AWS-compliant)
 * @param {string|null} options.domainName - The domain name, or null to skip custom domain setup
 * @param {string} options.sslCertificate - The ACM certificate ARN
 * @param {string} options.projectName - The Pushkin project name
 * @param {Promise} options.builtFrontEnd - Promise that resolves when the front-end build is complete
 * @returns {Promise<string>} The CloudFront domain name for the deployed front-end
 */
async function deployFrontEnd({
  s3BucketName,
  domainName,
  sslCertificate,
  projectName,
  builtFrontEnd,
}) {
  const oac = getOac();
  const acl = getAcl();
  const bucketReady = ensureBucket(s3BucketName);

  await Promise.all([bucketReady, builtFrontEnd]);
  const syncToBucket = syncS3(s3BucketName);

  const distribution = await ensureDistribution({
    s3BucketName: s3BucketName,
    projectName: projectName,
    domainName: domainName,
    sslCertificate: sslCertificate,
    oacId: await oac,
    webAclArn: await acl,
  });

  await setBucketPolicy(s3BucketName, distribution.ARN);

  if (domainName) {
    try {
      await makeRecordSet(domainName, projectName, distribution);
    } catch (error) {
      console.error(`Unable to create or update record set for ${domainName}`);
      throw error;
    }
  }

  await syncToBucket;
  await waitForCloudFrontDeployment(distribution.Id);

  return distribution.DomainName;
}

export { deployFrontEnd };
