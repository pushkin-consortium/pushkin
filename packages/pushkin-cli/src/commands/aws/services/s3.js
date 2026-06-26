/**
 * Handles building the React front-end and syncing it to S3, plus S3 bucket deletion.
 * S3: AWS object storage service used to host the static front-end files for Pushkin sites.
 * @module aws/services/s3
 */

import fs from "graceful-fs";
import path from "path";
import mime from "mime-types";
import { quote } from "shell-quote";
import { v4 as uuid } from "uuid";
import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { policy } from "../awsConfigs.js";
import pacMan from "../../../utils/package-manager.js";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { getAwsProfile } from "../utils/aws-profile.js";
import { loadAwsConfig } from "../utils/aws-config.js";
import { AWS_REGION, exec } from "../constants.js";

function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Recursively walk a directory and return all file paths.
 */
function walkDirectory(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }

  return fs
    .readdirSync(dir, { recursive: true })
    .filter((relativePath) => !fs.statSync(path.join(dir, relativePath)).isDirectory())
    .map((relativePath) => ({ absolutePath: path.join(dir, relativePath), relativePath }));
}

function createS3Client() {
  return new AWSClientFactory(AWS_REGION, getAwsProfile()).createClient(S3Client);
}

/**
 * Derives a valid S3 bucket name from a project name.
 * Appends a UUID to ensure global uniqueness; prepends "p" if the result starts with a digit.
 * @param {string} projectName
 * @returns {string} A globally unique, AWS-compliant S3 bucket name
 */
function generateBucketName(projectName) {
  let name = projectName
    .replace(/[\s_]/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .concat(uuid())
    .toLowerCase();
  if (!/^[a-z]/.test(name)) name = "p" + name;
  return name;
}

/**
 * Build the project's React front-end.
 * WHY: We need to build the front-end before deploying to S3 because we need the built static files
 * to sync with the S3 bucket.
 * @param {string} projectName
 * @param {boolean} verbose
 * @returns {Promise<void>} - A promise that resolves when the front-end is built
 */
async function buildFrontend(projectName, verbose = false) {
  console.log("Building front-end...");
  const packageJsonPath = path.join(process.cwd(), "pushkin/front-end/package.json");

  const packageJson = readJSON(packageJsonPath);

  // Determine build command based on build-if-changed availability
  let buildCommand;
  if (packageJson.dependencies?.["build-if-changed"] === undefined) {
    if (verbose) {
      console.log(
        `Project ${projectName} does not have build-if-changed installed. Recommend installation for faster prep.`,
      );
    }
    // --mutex network is yarn-specific; npm has no equivalent flag
    buildCommand =
      pacMan === "yarn" ? ["yarn", "--mutex", "network", "run", "build"] : [pacMan, "run", "build"];
  } else {
    if (verbose) {
      console.log(`Using build-if-changed for project ${projectName} for faster builds.`);
    }
    // --mutex network is yarn-specific; omit it when using npx
    buildCommand =
      pacMan === "yarn" ?
        ["yarn", "build-if-changed", "--mutex", "network"]
      : ["npx", "build-if-changed"];
  }

  await exec(quote(buildCommand), { cwd: path.join(process.cwd(), "pushkin/front-end") });
  if (verbose) console.log("Built combined front-end");
}

/**
 * Upload a single file to S3 with appropriate Content-Type.
 * WHY: Each file needs to be uploaded with the correct MIME type so browsers render them correctly.
 * @param {S3Client} s3Client - The S3 client instance
 * @param {string} bucketName
 * @param {string} filePath - The absolute path to the file
 * @param {string} s3Key - The S3 key (relative path in bucket)
 * @param {boolean} verbose - Whether to log upload details
 * @returns {Promise<void>} - A promise that resolves when the upload is complete
 */
async function uploadFileToS3(s3Client, bucketName, filePath, s3Key, verbose = false) {
  const fileContent = fs.readFileSync(filePath, null); // null encoding = read as Buffer
  const contentType = mime.lookup(filePath) || "application/octet-stream";

  if (verbose) {
    console.log(`Uploading ${s3Key} (${contentType}) to S3 bucket ${bucketName}`);
  }

  const params = {
    Bucket: bucketName,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(params));
}

/**
 * Ensure an S3 bucket exists, creating it if it doesn't.
 * @param {string} s3BucketName
 * @returns {Promise<void>}
 */
async function ensureBucket(s3BucketName) {
  const s3 = createS3Client();
  console.log(`Checking to see if bucket ${s3BucketName} already exists.`);
  const response = await s3.send(new ListBucketsCommand({}));
  const bucketExists = response.Buckets.some((bucket) => bucket.Name === s3BucketName);

  if (bucketExists) {
    console.log(`Bucket exists. Skipping create.`);
  } else {
    console.log("Bucket does not yet exist. Creating s3 bucket");
    await s3.send(new CreateBucketCommand({ Bucket: s3BucketName }));
  }
}

/**
 * Set the S3 bucket policy to allow access only from a specific CloudFront distribution.
 * @param {string} s3BucketName
 * @param {string} distributionArn - The ARN of the CloudFront distribution
 * @returns {Promise<void>}
 */
async function setBucketPolicy(s3BucketName, distributionArn) {
  const s3 = createS3Client();
  const bucketPolicy = structuredClone(policy);
  bucketPolicy.Statement[0].Resource = `arn:aws:s3:::${s3BucketName}/*`;
  bucketPolicy.Statement[0].Condition.StringEquals["AWS:SourceArn"] = distributionArn;
  console.log("Setting bucket permissions");
  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: s3BucketName,
      Policy: JSON.stringify(bucketPolicy),
    }),
  );
  console.log("Bucket permissions set successfully");
}

/**
 * Sync the local build with the S3 bucket.
 * WHY: We need to sync the local build with the S3 bucket to deploy the front-end to AWS.
 * This implementation uses the AWS SDK instead of the AWS CLI for better error handling
 * and to avoid external CLI dependencies.
 * @param {string} s3BucketName - The S3 bucket name (sanitized, globally unique, AWS-compliant)
 * @param {boolean} verbose - Whether to log detailed steps in syncing local front-end build with S3 bucket
 * @returns {Promise<void>} - A promise that resolves when the sync is complete
 */
async function syncS3(s3BucketName, verbose = false) {
  console.log(`Syncing static front-end files to S3 bucket ${s3BucketName}`);
  const buildDir = path.join(process.cwd(), "pushkin/front-end/build");

  if (!fs.existsSync(buildDir)) {
    throw new Error(`Build directory not found: ${buildDir}`);
  }

  const files = walkDirectory(buildDir);
  if (verbose) console.log(`Found ${files.length} files to upload`);

  const s3Client = createS3Client();
  const batchSize = loadAwsConfig().s3.uploadBatchSize;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(
      batch.map(({ absolutePath, relativePath }) =>
        uploadFileToS3(s3Client, s3BucketName, absolutePath, relativePath, verbose),
      ),
    );
    if (verbose) console.log(`Uploaded ${Math.min(i + batchSize, files.length)}/${files.length} files`);
  }

  console.log(`Successfully synced ${files.length} files to S3 bucket ${s3BucketName}`);
}

/**
 * Delete all objects in an S3 bucket.
 * WHY: S3 buckets must be empty before they can be deleted.
 * @param {S3Client} s3Client - The S3 client instance
 * @param {string} bucketName
 * @param {boolean} verbose – Whether to log details in bucket emptying process
 * @returns {Promise<void>} - A promise that resolves when all objects are deleted
 */
async function emptyBucket(s3Client, bucketName, verbose = false) {
  let isTruncated = true;
  let continuationToken;
  let totalDeleted = 0;

  while (isTruncated) {
    const listParams = {
      Bucket: bucketName,
      ...(continuationToken && { ContinuationToken: continuationToken }),
    };
    const listResponse = await s3Client.send(new ListObjectsV2Command(listParams));

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      await s3Client.send(new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })) },
      }));
      totalDeleted += listResponse.Contents.length;
      if (verbose) console.log(`Deleted ${totalDeleted} objects from ${bucketName}...`);
    }

    isTruncated = listResponse.IsTruncated;
    continuationToken = listResponse.NextContinuationToken;
  }

  if (totalDeleted > 0 && verbose) {
    console.log(`Emptied ${bucketName}: deleted ${totalDeleted} total objects`);
  }
}

/**
 * Delete a single S3 bucket (after emptying it).
 * WHY: Errors are warned but not rethrown so that parallel deletion of other buckets continues.
 * @param {S3Client} s3Client - The S3 client instance
 * @param {string} bucketName
 * @returns {Promise<void>} - A promise that resolves when the bucket is deleted
 */
async function deleteSingleBucket(s3Client, bucketName) {
  console.log(`Deleting S3 bucket ${bucketName}`);
  try {
    await emptyBucket(s3Client, bucketName);
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    console.log(`Successfully deleted S3 bucket ${bucketName}`);
  } catch (error) {
    console.warn(`Unable to delete S3 bucket ${bucketName}:`, error);
  }
}

/**
 * Delete S3 buckets.
 * WHY: S3 bucket needs to be deleted during teardown to avoid orphaned resources and potential costs.
 * @param {string|null} killTag - If string (project name), only delete project bucket; if null/falsy, delete all buckets
 * @param {object} awsResources - The AWS resources object (contains s3BucketName)
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront distribution is deleted
 * @param {boolean} verbose - Whether to log detailed steps in the deletion process
 * @returns {Promise<void>} - A promise that resolves when deletion is complete
 */
async function deleteS3Buckets(killTag, awsResources, deletedCloudFront, verbose = false) {
  // Wait for CloudFront distribution to be deleted first (S3 buckets can't be deleted while CloudFront uses them)
  await deletedCloudFront;

  const s3Client = createS3Client();
  console.log(`Retrieving list of S3 buckets to delete...`);

  const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
  const buckets = listBucketsResponse.Buckets ?? [];

  if (buckets.length === 0) {
    console.log(`No S3 buckets found. Skipping.`);
    return;
  }

  // TODO: killize
  let bucketsToDelete;
  if (!killTag) {
    bucketsToDelete = buckets;
    console.log(`Deleting all ${buckets.length} S3 buckets (armageddon mode) in AWS account.`);
  } else {
    const projectBucketName = awsResources?.s3BucketName;
    if (!projectBucketName) {
      console.warn(`No project bucket name found in awsResources. Skipping S3 deletion.`);
      return;
    }
    bucketsToDelete = buckets.filter((bucket) => bucket.Name === projectBucketName);
    if (bucketsToDelete.length === 0) {
      if (verbose) {
        console.log(`Project bucket "${projectBucketName}" not found. Skipping.`);
      }
      return;
    }
    if (verbose) {
      console.log(`Deleting project S3 bucket: ${projectBucketName}`);
    }
  }

  // Delete buckets in parallel
  await Promise.all(bucketsToDelete.map((bucket) => deleteSingleBucket(s3Client, bucket.Name)));
  console.log(`Finished deleting ${bucketsToDelete.length} S3 buckets.`);
}

export {
  generateBucketName,
  buildFrontend,
  ensureBucket,
  setBucketPolicy,
  syncS3,
  deleteS3Buckets,
};
