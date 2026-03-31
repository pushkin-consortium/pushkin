import {
  S3Client,
  ListBucketsCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import fs from "graceful-fs";
import path from "path";
import { AWSClientFactory } from "../utils/aws-client-factory.js";
import { AWS_REGION as myRegion, exec, pacMan } from "../constants.js";

/**
 * Build the project's React front-end
 * @param {string} projName - The project name
 * @returns {Promise} - A promise that resolves when the front-end is built
 */
const buildFE = function (projName) {
  return new Promise((resolve, reject) => {
    //can we use build-if-changed?
    console.log("Building front-end");
    const packageJsonPath = path.join(process.cwd(), "pushkin/front-end/package.json");
    let packageJson;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch (e) {
      console.error("Failed to parse front-end package.json");
      throw e;
    }
    let buildCmd;
    if (packageJson.dependencies["build-if-changed"] == null) {
      console.log(
        projName,
        " does not have build-if-changed installed. Recommend installation for faster runs of prep.",
      );
      buildCmd = pacMan.concat(" --mutex network run build");
    } else {
      console.log("Using build-if-changed for", projName);
      const pacRunner = pacMan == "yarn" ? "yarn" : "npx";
      buildCmd = pacRunner.concat(" build-if-changed --mutex network");
    }
    let builtWeb;
    console.log("Building combined front-end");
    try {
      builtWeb = exec(buildCmd, { cwd: path.join(process.cwd(), "pushkin/front-end") }).then(() => {
        console.log("Installed combined front-end");
        resolve(builtWeb);
      });
    } catch (error) {
      console.error("Problem installing and buiding combined front-end");
      console.error(error);
      process.exit();
    }
  });
};

/**
 * Sync the local build with the S3 bucket
 * @param {string} awsName - The S3 bucket name
 * @param {string} useIAM - The IAM profile to use
 * @returns {Promise} - A promise that resolves when the sync is complete
 */
const syncS3 = async (awsName, useIAM) => {
  console.log("Syncing files to bucket");
  try {
    // TODO: This aws s3 sync command needs to be migrated to SDK
    // It requires implementing file upload functionality with PutObjectCommand
    // and directory traversal to match the sync behavior
    return exec(`aws s3 sync build/ s3://${awsName} --profile ${useIAM}`, {
      cwd: path.join(process.cwd(), "pushkin/front-end"),
    });
  } catch (e) {
    console.error(`Unable to sync local build with s3 bucket`);
    throw e;
  }
};

/**
 * Delete S3 buckets
 * @param {string|object} useIAM - The IAM profile or object with IAM info
 * @param {string|boolean} killTag - The kill tag for selective deletion
 * @param {object} awsResources - The AWS resources object
 * @param {Promise} deletedCloudFront - Promise that resolves when CloudFront is deleted
 * @returns {Promise} - A promise that resolves when deletion is complete
 */
const deleteBucket = async (useIAM, killTag, awsResources, deletedCloudFront) => {
  await deletedCloudFront;
  //FUBAR Need to killize this
  let buckets;
  try {
    const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
    const factory = new AWSClientFactory(myRegion, profileName);
    const s3Client = factory.createClient(S3Client);
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    buckets = { stdout: JSON.stringify({ Buckets: listBucketsResponse.Buckets }) };
  } catch (e) {
    console.error(`Unable to list buckets`);
    throw e;
  }
  if (JSON.parse(buckets.stdout).Buckets.length > 0) {
    return Promise.all(
      JSON.parse(buckets.stdout).Buckets.map(async (b) => {
        console.log(`Deleting s3 bucket ${b.Name}`);
        try {
          const profileName = typeof useIAM === "string" ? useIAM : useIAM.iam;
          const factory = new AWSClientFactory(myRegion, profileName);
          const s3Client = factory.createClient(S3Client);
          // List all objects in the bucket
          let isTruncated = true;
          let continuationToken;
          while (isTruncated) {
            const listParams = {
              Bucket: b.Name,
              ...(continuationToken && { ContinuationToken: continuationToken }),
            };
            const listResponse = await s3Client.send(new ListObjectsV2Command(listParams));

            // Delete objects if any exist
            if (listResponse.Contents && listResponse.Contents.length > 0) {
              const deleteParams = {
                Bucket: b.Name,
                Delete: {
                  Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
                },
              };
              await s3Client.send(new DeleteObjectsCommand(deleteParams));
            }

            isTruncated = listResponse.IsTruncated;
            continuationToken = listResponse.NextContinuationToken;
          }

          // Delete the bucket
          await s3Client.send(new DeleteBucketCommand({ Bucket: b.Name }));
        } catch (e) {
          console.warn(`Unable to delete s3 bucket ${awsResources.awsName}`);
        }
      }),
    );
  } else {
    console.log(`No s3 bucket. Skipping.`);
    return true;
  }
};
// Export all functions
export { buildFE, syncS3, deleteBucket };
