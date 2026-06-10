import fs from "graceful-fs";
import path from "path";

function getAwsResourcesPath() {
  return path.join(process.cwd(), "awsResources.json");
}

function loadAwsResources() {
  const filePath = getAwsResourcesPath();
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeAwsResources(awsResources) {
  const filePath = getAwsResourcesPath();
  fs.writeFileSync(filePath, JSON.stringify(awsResources, null, 2), "utf8");
}

function updateAwsResourcesField(field, value) {
  const awsResources = loadAwsResources();
  awsResources[field] = value;
  writeAwsResources(awsResources);
}

export { loadAwsResources, writeAwsResources, updateAwsResourcesField };
