import path from "path";
import { $, fs } from "zx";
import { updatePushkinJs, setEnv } from "../prep/index.js";

/**
 * Sets up a new Pushkin site as a private Node package so site and experiment templates can be added as dependencies.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 */
export const initSite = async (verbose) => {
  try {
    // Check that there isn't already a package.json
    if (fs.existsSync("package.json")) {
      console.error(
        "A package.json already exists in this directory. You should run `pushkin install site` in a new directory.",
      );
      process.exit(1);
    }
    if (fs.existsSync("pushkin")) {
      console.error(
        "A `pushkin` directory already exists here. You should run `pushkin install site` in a new directory.",
      );
      process.exit(1);
    }
    if (fs.existsSync("users")) {
      console.error(
        "A `users` directory already exists here. You should run `pushkin install site` in a new directory.",
      );
      process.exit(1);
    }
    try {
      // Make sure files with passwords don't get pushed to GitHub
      const ignoreFiles = [
        "pushkin.yaml",
        ".docker",
        ".DS_Store",
        ".vscode",
        "node_modules",
        "build",
        "test-results/",
        "playwright-report/",
        "blob-report/",
        "playwright/.cache/",
      ];
      fs.writeFileSync(".gitignore", ignoreFiles.join("\n"));
    } catch (e) {
      console.error("Unable to write .gitignore during site template setup", e);
      process.exit(1);
    }
    // Create the package.json
    if (verbose) console.log("Setting up site package");
    // Set up site package and add testing dependencies
    const devDeps = {
      "@babel/core": "^7.23.6",
      "@babel/preset-env": "^7.23.6",
      "@babel/preset-react": "^7.23.3",
      "@playwright/test": "^1.47.2",
      "@types/node": "^22.7.4",
      jest: "^29.7.0",
      "jest-environment-jsdom": "^29.7.0",
      "js-yaml": "^4.1.0",
      knex: "^3.1.0",
      pg: "^8.13.0",
    };
    const devDepsArray = Object.entries(devDeps).map(([key, value]) => `${key}@${value}`);
    await $`yarn init -yp`;
    await $`yarn add --dev ${devDepsArray}`;
    await $`yarn playwright install --with-deps`;
    // Edit package.json
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    delete packageJson.main;
    packageJson.name = "pushkin-site";
    packageJson.scripts = { test: "jest", "test:e2e": "playwright test" };
    // Write the updated package.json
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.error("Error setting up site package:", error);
  }
};

/**
 * Installs dependencies and builds the front-end and API packages for Pushkin sites (also used for experiment workers).
 * @param {string} initDir The directory containing the component.
 * @param {string} component The name of the site/exp component (e.g. "front-end", "api").
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {Promise<string>} A promise that resolves to "Built" if the build is successful
 */
export const promiseFolderInit = async (initDir, component, verbose) => {
  if (verbose) {
    console.log("--verbose flag set inside promiseFolderInit()");
    console.log(`Installing dependencies for ${component}`);
  }
  try {
    await $({ cwd: path.join(initDir, component) })`yarn --mutex network install`;
    if (verbose) console.log(`Building ${component}`);
    updatePushkinJs(verbose); //synchronous
    if (verbose) console.log(`Building front end`);
    await $({ cwd: path.join(initDir, component) })`yarn --mutex network run build`;
    if (verbose) console.log(`${component} is built`);
  } catch (e) {
    console.error(`Problem installing dependencies for ${component}`);
    throw e;
  }
  return "Built";
};

/**
 * Performs setup tasks for a Pushkin site after template files have been copied into the site directory.
 * @param {boolean} verbose Output extra information to the console for debugging purposes.
 * @returns {Promise<Array>} A promise that resolves with an array containing the resolved values of all the setup tasks.
 */
export const setupPushkinSite = async (verbose) => {
  if (verbose) console.log("--verbose flag set inside setupPushkinSite()");
  try {
    await fs.remove("__MACOSX");
  } catch (e) {
    console.error("Problem removing __MACOSX file:", e);
  }
  setEnv(true, verbose); // synchronous; sets `debug` env var to true
  return new Promise((resolve, reject) => {
    // Move/rename pushkin.yaml and config.js in their proper locations
    const pushkinYaml = fs.promises
      .rename("pushkin/pushkin.yaml.bak", "./pushkin.yaml")
      .catch((e) => {
        console.error(e);
        reject(e);
      });
    const configJS = fs.promises
      .rename("pushkin/config.js.bak", "pushkin/front-end/src/config.js")
      .catch((e) => {
        console.error(e);
        reject(e);
      });
    // Make the experiments directory
    const mkExps = fs.promises.mkdir("experiments").catch((e) => {
      console.error(e);
      reject(e);
    });
    // Set up the api and front-end packages
    const apiPromise = promiseFolderInit(path.join(process.cwd(), "pushkin"), "api", verbose).catch(
      (e) => {
        console.error(e);
        reject(e);
      },
    );
    const frontendPromise = promiseFolderInit(
      path.join(process.cwd(), "pushkin"),
      "front-end",
      verbose,
    ).catch((e) => {
      console.error(e);
      reject(e);
    });
    resolve(Promise.all([pushkinYaml, configJS, mkExps, apiPromise, frontendPromise]));
  });
};

// export async function pushkinInit() {
//   //Deprecated. Shouldn't really need this. Keeping it as a useful example of working with Docker.
//   //However, the same thing can be achieved by adding 'POSTGRES_DB: test_db' to the docker-compose environment variables.
//       const dbPromise = compose.upOne('test_db', {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
//         .then((resp) => resp, err => console.log('something went wrong starting database container:', err))

//       const wait = async () => {
//         //Sometimes, I really miss loops
//         let x = await compose.ps({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
//               .then((x) => x.out.search('healthy'), err => {console.error('Problem with waiting:',err)})
//         if (x) {
//           console.log(x);
//           return compose.exec('test_db', ['psql', '-U', 'postgres', '-c', 'create database test_db'], {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
//             .then((resp) => resp, err => console.log('something went wrong:', err))
//         } else {
//           setTimeout( wait, 500 );
//         }
//       }
//       const dbCreate = wait(); //ridiculously roundabout loop
//       return await Promise.all([dbPromise, dbCreate]);
// }
