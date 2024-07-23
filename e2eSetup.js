#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");
const siteType = process.argv[2];

try {
  if (!siteType) {
    throw new Error("Please provide a site type as an argument.");
  }
  if (!fs.existsSync(`./templates/sites/${siteType}`)) {
    throw new Error(`Site type "${siteType}" does not exist.`);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

console.log("Setting up a new Pushkin site for testing...");

// Clear out Docker
execSync("docker system prune -a -f", { stdio: "inherit" });
execSync("node ./packages/pushkin-cli/build/index.js armageddon", { stdio: "inherit" });

// Clear out the testing directory
if (fs.existsSync("./testing")) {
  fs.rmSync("./testing", { recursive: true });
}
fs.mkdirSync("./testing");

// Setup and start a new Pushkin site
process.chdir("testing");
execSync(
  `node ../packages/pushkin-cli/build/index.js i site --path ../templates/sites/${siteType} -v`,
  { stdio: "inherit" },
);
execSync("node ../packages/pushkin-cli/build/index.js i exp --all ../templates/experiments -v", {
  stdio: "inherit",
});
execSync(
  "node ../packages/pushkin-cli/build/index.js use-dev api client worker --path ../packages -v",
  { stdio: "inherit" },
);
execSync("node ../packages/pushkin-cli/build/index.js prep -v", { stdio: "inherit" });
execSync("node ../packages/pushkin-cli/build/index.js start -v", { stdio: "inherit" });
