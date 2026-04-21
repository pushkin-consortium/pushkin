import {
  S3Client,
  ListBucketsCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";
import mime from "mime-types";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION as myRegion, exec } from "../constants.js";
import pacMan from "../../../utils/package-manager.js";
import { readJSON, fileExists, walkDirectory, readFile } from "../../../utils/file.js";

/**
 * (Helper)
 * Creates an S3 client with consistent configuration
 * WHY: Ensure all S3 operations use the same region and IAM profile
 */
const createS3Client = (useIAM) => {
  const profileName = useIAM;
  const factory = new AWSClientFactory(myRegion, profileName);
  return factory.createClient(S3Client);
};

/**
 * Build the project's React front-end
 * WHY: We need to build the front-end before deploying to S3 because we need the built static files
 * to sync with the S3 bucket
 * @param {string} projName - The project name
 * @param {boolean} verbose - Whether to log detailed steps in building the front-end
 * @returns {Promise} - A promise that resolves when the front-end is built
 */
const buildFrontEnd = async (projName, verbose = false) => {
  console.log("Building front-end...");
  const packageJsonPath = path.join(process.cwd(), "pushkin/front-end/package.json");

  let packageJson;
  try {
    packageJson = readJSON(packageJsonPath);
  } catch (error) {
    console.error(`Failed to parse front-end package.json:`, error);
    throw error;
  }

  // Determine build command based on build-if-changed availability
  let buildCmd;
  if (packageJson.dependencies["build-if-changed"] == null) {
    if (verbose) {
      console.log(
        `Project ${projName} does not have build-if-changed installed. Recommend installation for faster prep.`,
      );
    }
    buildCmd = pacMan + " --mutex network run build";
  } else {
    if (verbose) {
      console.log(`Using build-if-changed for project ${projName} for faster builds.`);
    }
    const pacRunner = pacMan == "yarn" ? "yarn" : "npx";
    buildCmd = pacRunner + " build-if-changed --mutex network";
  }

  if (verbose) {
    console.log("Building combined front-end...");
  }
  try {
    await exec(buildCmd, { cwd: path.join(process.cwd(), "pushkin/front-end") });
    if (verbose) {
      console.log("Built combined front-end");
    }
  } catch (error) {
    console.error(`Problem installing and building combined front-end:`, error);
    throw error;
  }
};

/**
 * (Helper)
 * Upload a single file to S3 with appropriate Content-Type
 * WHY: Each file needs to be uploaded with the correct MIME type so browsers render them correctly
 * @param {S3Client} s3Client - The S3 client instance
 * @param {string} bucketName - The S3 bucket name
 * @param {string} filePath - The absolute path to the file
 * @param {string} s3Key - The S3 key (relative path in bucket)
 * @param {boolean} verbose - Whether to log upload details
 * @returns {Promise} - A promise that resolves when the upload is complete
 */
const uploadFileToS3 = async (s3Client, bucketName, filePath, s3Key, verbose = false) => {
  const fileContent = readFile(filePath, null); // null encoding = read as Buffer
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

  try {
    await s3Client.send(new PutObjectCommand(params));
  } catch (error) {
    console.log(`Error uploading ${s3Key} to S3 bucket ${bucketName}:`, error);
    throw error;
  }
};

/**
 * Sync the local build with the S3 bucket
 * WHY: We need to sync the local build with the S3 bucket to deploy the front-end to AWS
 * This implementation uses the AWS SDK instead of the AWS CLI for better error handling
 * and to avoid external CLI dependencies
 * @param {string} s3BucketName - The S3 bucket name (sanitized, globally unique, AWS-compliant)
 * @param {string} useIAM - The IAM profile to use
 * @param {boolean} verbose - Whether to log detailed steps in syncing local front-end build with S3 bucket
 * @returns {Promise} - A promise that resolves when the sync is complete
 */
const syncS3 = async (s3BucketName, useIAM, verbose = false) => {
  console.log(`Syncing static front-end files to S3 bucket ${s3BucketName}`);
  try {
    const buildDir = path.join(process.cwd(), "pushkin/front-end/build");

    if (!fileExists(buildDir)) {
      throw new Error(`Build directory not found: ${buildDir}`);
    }

    const files = walkDirectory(buildDir);

    if (verbose) {
      console.log(`Found ${files.length} files to upload`);
    }

    const s3Client = createS3Client(useIAM);

    const BATCH_SIZE = 10; // Upload 10 files at a time to avoid overwhelming the connection
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(({ absolutePath, relativePath }) =>
          uploadFileToS3(s3Client, s3BucketName, absolutePath, relativePath, verbose),
        ),
      );

      if (verbose) {
        console.log(`Uploaded ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} files`);
      }
    }

    console.log(`Successfully synced ${files.length} files to S3 bucket ${s3BucketName}`);
  } catch (error) {
    console.error(`Unable to sync local build with S3 bucket:`, error);
    throw error;
  }
};

/**
 * (Helper)
 * Delete all objects in an S3 bucket
 * WHY: S3 buckets must be empty before they can be deleted
 * @param {S3Client} s3Client - The S3 client instance
 * @param {string} bucketName - The S3 bucket name
 * @param {boolean} verbose – Whether to log details in bucket emptying process
 * @returns {Promise} - A promise that resolves when all objects are deleted
 */
const emptyBucket = async (s3Client, bucketName, verbose = false) => {
  let isTruncated = true;
  let continuationToken;
  let totalDeleted = 0;

  while (isTruncated) {
    try {
      const listParams = {
        Bucket: bucketName,
        ...(continuationToken && { ContinuationToken: continuationToken }),
      };
      const listResponse = await s3Client.send(new ListObjectsV2Command(listParams));

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deleteParams = {
          Bucket: bucketName,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
          },
        };
        await s3Client.send(new DeleteObjectsCommand(deleteParams));
        totalDeleted += listResponse.Contents.length;
        if (verbose) {
          console.log(`Deleted ${totalDeleted} objects from ${bucketName}...`);
        }
      }

      isTruncated = listResponse.IsTruncated;
      continuationToken = listResponse.NextContinuationToken;f
    } catch (error) {
      console.log(`Failed to empty bucket ${bucketName}:`, error);
      throw error;
    }

    if (totalDeleted > 0 && verbose) {
      console.log(`Emptied ${bucketName}: deleted ${totalDeleted} total objects`);
    }
  }
};

/**
 * (Helper)
 * Delete a single S3 bucket (after emptying it)
 * @param {S3Client} s3Client - The S3 client instance
 * @param {string} bucketName - The S3 bucket name
 * @returns {Promise} - A promise that resolves when the bucket is deleted
 */
const deleteSingleBucket = async (s3Client, bucketName) => {
  console.log(`Deleting S3 bucket ${bucketName}`);
  try {
    await emptyBucket(s3Client, bucketName);
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    console.log(`Successfully deleted S3 bucket ${bucketName}`);
  } catch (error) {
    console.warn(`Unable to delete S3 bucket ${bucketName}:`, error);
  }
};

/**
 * Delete S3 buckets
 * WHY: S3 bucket needs to be deleted during teardown to avoid orphaned resources and potential costs
 * @param {string} useIAM - The IAM profile name
 * @param {string|boolean} killTag - If string (project name), only delete project bucket; if false, delete all buckets
 * @param {object} awsResources - The AWS resources object (contains s3BucketName)
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront distribution is deleted
 * @returns {Promise} - A promise that resolves when deletion is complete
 */
const deleteS3Buckets = async (useIAM, killTag, awsResources, deletedCloudFront, verbose = false) => {
  // Wait for CloudFront distribution to be deleted first (S3 buckets can't be deleted while CloudFront uses them)
  await deletedCloudFront;

  const s3Client = createS3Client(useIAM);
  console.log(`Retrieving list of S3 buckets to delete...`);

  let buckets;
  try {
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    buckets = listBucketsResponse.Buckets || [];
  } catch (error) {
    console.error(`Unable to list buckets:`, error);
    throw error;
  }

  if (buckets.length === 0) {
    console.log(`No S3 buckets found. Skipping.`);
    return;
  }

  // Filter buckets based on killTag
  let bucketsToDelete;
  if (!killTag) {
    // Armageddon mode: delete all buckets
    bucketsToDelete = buckets;
    console.log(`Deleting all ${buckets.length} S3 buckets (armageddon mode) in AWS account.`);
  } else {
    // Kill mode: delete only the project bucket (match by name)
    const projectBucketName = awsResources?.s3BucketName;
    if (!projectBucketName) {
      if (verbose) {
        console.log(`No project bucket name found in awsResources. Skipping S3 deletion.`);
      }
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
};

// Export functions
export { buildFrontEnd, syncS3, deleteS3Buckets };
