# Pushkin CLI

## skip to section

- [installation](pushkin-cli.md#installation)
  - [update](pushkin-cli.md#update)
- [commands](pushkin-cli.md#commands)
  - [config](pushkin-cli.md#config)
  - [install site](pushkin-cli.md#install-site)
  - [install experiment](pushkin-cli.md#install-experiment)
  - [updateDB](pushkin-cli.md#updatedb)
  - [prep](pushkin-cli.md#prep)
  - [start](pushkin-cli.md#start)
  - [stop](pushkin-cli.md#stop)
  - [kill](pushkin-cli.md#kill)
  - [armageddon](pushkin-cli.md#armageddon)
  - [help](pushkin-cli.md#help)

## installation

The Pushkin command-line package is available via **Yarn**. We highly recommend a global install in order to make working with Pushkin projects as easy as possible:

```bash
 yarn global add pushkin-cli
```

### update

To update the Pushkin CLI to the most recently released version, run:

```bash
 yarn global upgrade pushkin-cli --latest
```

Any subcommand that affects a specific project must be run from a folder inside the project you wish to modify.

## cli commands

### config

Syntax: `pushkin config [what]` 

Provides a way to view the configuration file for a specified site or module, identified by replacing `[what]` with "site" or the name of the experiment. If `[what]` is omitted, the command defaults to displaying the configuration of all modules.

#### details

1. **load and parse configuration**: 
   - Utilizes `fs.readFileSync` to synchronously read the targeted YAML configuration file from the filesystem.
   - Employs `jsYaml.safeLoad` to parse the read file into a JavaScript object.

2. **error handling**: 
   - In case of file loading or parsing issues (e.g., file not found, invalid YAML syntax), an error message is logged to the console, and the process is exited.

#### usage

- **for site configuration**: 
  ```shell
  pushkin config site
  ```
- **for experiment configuration**: 
  ```shell
  pushkin config [experiment_name]
  ```

### install site

Syntax: `pushkin install site`

The `pushkin install site` command streamlines the installation of a site template into your Pushkin project. This process involves selecting a template, validating its contents, and configuring it within your project structure.

#### arguments

- **verbose mode**: 
  ```bash
  pushkin install site --verbose
  ```
  Provides extended console output for debugging.

- **help**:
  ```bash
  pushkin install site --help
  ```
  Displays the command's help information.

#### core functions

- **`copyPushkinSite(initDir, pathToSite, verbose)`**: 
  - **purpose**: Installs a local Pushkin site template into the project.
  - **behavior**: Validates the local path for necessary folders and checks against overwriting existing directories and files in the destination. Subsequently, it copies the site template, adjusts configurations, and initiates the API and frontend directories.
  - **parameters**:
    - `initDir`: The initial directory to set up the site.
    - `pathToSite`: The absolute path to the local site template.
    - `verbose`: A flag to toggle verbose logging.

- **`getPushkinSite(initDir, url, verbose)`**:
  - **purpose**: Retrieves and installs a Pushkin site template from a specified URL.
  - **behavior**: Ensures the project structure is clear for installation, downloads the specified site template zip file from the URL, extracts, and installs it into the project. Also, initiates API and frontend directories.
  - **parameters**:
    - `initDir`: The initial directory to set up the site.
    - `url`: The URL to retrieve the site template.
    - `verbose`: A flag to toggle verbose logging.

- **`setupTestTransactionsDB(verbose)`**:
  - **purpose**: Establishes a test transaction database.
  - **behavior**: Ensures proper configuration of the local test transaction database in `docker-compose` and `pushkin.yaml`, and generates migration files if not existent.
  - **parameters**:
    - `verbose`: A flag to toggle verbose logging.

#### usage guide

The command execution flow in `pushkin install site` is as follows:

1. **select a site template**: 
   - Options include choosing the basic template or specifying a path or URL.
   - A template from a URL must point directly to a GitHub release API endpoint and will prompt the user to choose a version to install.
   
   ```bash
    ? Which site template do you want to use? (Use arrow keys)
    ❯ basic 
      path 
      url 
   ```
2. **template installation**: 
   - For a template from a local path (`copyPushkinSite`): Validates and copies the local site template, ensuring no name conflicts or overwrites.
   - For a template from a URL (`getPushkinSite`): Downloads, extracts, and installs it, handling the folder structure and temporary files.

3. **site initialization**: 
   - Once a template is installed, additional configurations, directory setup, and file renaming occur to initialize the API and frontend components of the site.
   - A test transaction database is set up via `setupTestTransactionsDB` for local testing, with configurations being updated/added in `pushkin.yaml` and `docker-compose.dev.yml`.


### install experiment

Syntax: `pushkin install experiment`

The `pushkin install experiment` command orchestrates the installation and initialization of an experiment template into a Pushkin project. It handles template retrieval (either through download or from a local path), directory validation, and configuration of the new experiment.

#### arguments

- **verbose mode**: 
  ```bash
  pushkin install experiment --verbose
  ```
  Provides extended console output for debugging.

- **help**:
  ```bash
  pushkin install experiment --help
  ```
  Displays the command's help information.

#### core functions

1. **`copyExpTemplate(experimentsDir, expPath, longName, newExpName, rootDir, verbose)`**:
   
   - **purpose**: Copy a local experiment template into the project's experiments directory, ensuring the necessary folders (like "api controllers" and "migrations") are present in the path.
   - **parameters**:
     - `experimentsDir`: Target directory for the experiment.
     - `expPath`: Source path of the local experiment template.
     - `longName`: Descriptive name for the experiment.
     - `newExpName`: Short name for the experiment.
     - `rootDir`: Root directory of the project.
     - `verbose`: Flag for verbose console output.
   - **process**:
     - Validates that the provided path exists and contains necessary folders.
     - Checks and ensures that the new experiment name is unique and follows naming conventions.
     - Copies the local experiment template to the designated directory and initializes the experiment via `initExperiment()`.

2. **`getExpTemplate(experimentsDir, url, longName, newExpName, rootDir, verbose)`**:

   - **purpose**: Download an experiment template from a specified URL and install it into the project's experiments directory.
   - **parameters**:
     - `experimentsDir`, `longName`, `newExpName`, `rootDir`, and `verbose`: Same as above.
     - `url`: URL from which the experiment template will be downloaded.
   - **process**:
     - Validates the new experiment name.
     - Downloads the experiment template from the provided URL.
     - Extracts and installs the template in the target directory.
     - Invokes `initExperiment()` to complete the experiment setup.

3. **`initExperiment(expDir, expName, longName, rootDir, verbose)`**:

   - **purpose**: Initialize and configure an experiment after it has been installed.
   - **parameters**:
     - `expDir`: Directory where the experiment resides.
     - `expName`: Short name for the experiment.
     - `longName` and `rootDir`: As described above.
   - **process**:
     - Renames files and updates internal references to match the new experiment name.
     - Reads and updates the experiment configuration, adjusting the experiment and short names.
     - Initializes API, web, and worker components, creating Docker compose files and updating configurations accordingly.
     - Modifies controller JSONs to incorporate new API controllers and updates the main Docker compose file to include the new worker service.

#### usage guide:

**naming the Experiment**

Upon executing `pushkin install experiment`, you'll need to name your experiment. Ensure the name is unique to prevent conflicts with existing experiments.

**template selection**

You'll choose a template using:
- A predefined template (`basic`).
- A path to a local template (`path`).
- A URL to download a template (`url`).

Example interaction:

```bash
? What do you want to call your experiment? test
? Which experiment template do you want to use? (Use arrow keys)
❯ basic 
  path 
  url 
```

**template source specification**

Depending on your choice, you'll specify:
- The absolute path for "path".
- A URL, ensuring it is a valid GitHub API endpoint, for "url".

**template installation**

The selected template is downloaded (if applicable), extracted, and installed in the Pushkin project.


### updateDB

Syntax: `pushkin updateDB`

The `pushkin updateDB` command manages migrations and seedings for experiment databases, ensuring coordinated updates especially when experiments share a database. This command is also executed during `pushkin prep`.

#### arguments:

- **verbose mode**: 
  ```bash
  pushkin updateDB --verbose
  ```
  Provides extended console output for debugging.

#### core function

1. **`setupdb(coreDBs, mainExpDir, verbose)`**
    * purpose: Manage initialization, migration, and graceful shutdown of databases within a Pushkin project.
    * parameters:
      - `coreDBs`: Core databases requiring initialization and migration.
      - `mainExpDir`: Directory containing experiment migrations.
      - `verbose`: Flag to enable detailed logging.
    * process:
      1. **initialize databases**: Spool up required database containers using Docker.
      2. **retrieve migrations**: Obtain migration scripts from `mainExpDir`.
      3. **apply migrations**: Execute migrations on experiment and transaction databases, ensuring data schema consistency.
      4. **shutdown databases**: Gracefully terminate database containers post-migration.

### prep

Syntax: `pushkin prep`

Execute `pushkin prep` within a Pushkin project to prepare it for local testing, managing dependencies, configurations, and optionally, running migrations across all experiments.

#### arguments

- `--nomigrations`: Avoid running migrations. Use when the database structure is unchanged.
- `--verbose`: Enable detailed console output for debugging.
- `--help`: Display command help.

#### details

`pushkin prep` performs a series of operations to ensure that the Pushkin project is ready for local testing:

- **experiments loop**: Iterates through each experiment, as defined in `pushkin.yaml`, performing the following tasks for each:
  - **API controllers**: Compiled, tarballed, and moved to `pushkin/api/tempPackages`, then added as a local package to `pushkin/api/package.json`.
  - **worker**: Compiled and dockerized, with its image added to `docker-compose.dev.yml`.
  - **web page**: Compiled, tarballed, and moved to `pushkin/front-end/tempPackages`.

- **update experiment list**: Modifies `pushkin/front-end/src/experiments.js` to list each experiment and its configuration, used by the front end to display available experiments to participants.

- **cleanup**: Prior to the aforementioned steps, `prep` purges old tempPackages, cleans `package.json` and `docker-compose-dev.yml`, and clears `experiments.js`. To delete an experiment, remove its folder from the experiments directory (manual docker image cleanup for the worker may be needed).

#### core functions

1. **`prep(experimentsDir, coreDir, verbose)`**
    * purpose: Ensure experiments are ready for local testing by managing dependencies and configurations.
    * parameters:
      - `experimentsDir`: Directory containing experiments.
      - `coreDir`: Core directory of the Pushkin code.
      - `verbose`: Flag for verbose console output.
    * process:
      - **clean web**: Resets `experiments.js`.
      - **prepare experiments**: Manages API controllers, worker, and web page preparations for each experiment.
      - **update experiments list**: Modifies `experiments.js` with experiment data.

### start

Syntax: `pushkin start [options]`

Starts local deploy for debugging purposes. To start only the front end \(no databases\), see the manual.

The command `pushkin start` has three optional arguments: `--nocache`, `--verbose`, and `--help`.

Running `pushkin start --nocache` will rebuild all images from scratch without using the cache. By default, this is false.

Running `pushkin start --verbose` will show additional console output which may be helpful for debugging.

Running `pushkin start --help` will display help for the command.

### stop

Syntax: `pushkin stop`

Stops the local deploy. This will not remove the local docker images. To do that, see documentation for [pushkin kill](pushkin-cli.md#kill) and [pushkin armageddon](pushkin-cli.md#armageddon).

### kill

Syntax: `pushkin kill`

Removes all containers and volumes from local Docker, as well as pushkin-specific images. Sometimes, if you're having issues developing or seeing updates to your Pushkin project, it may be helpful to run this command to ensure docker isn't holding any problematic code or issues in containers.

### armageddon

Syntax: `pushkin armageddon`

Complete reset of the local docker, including containers, volumes, and third-party images. Sometimes, if you're having issues developing or seeing updates to your Pushkin project, it may be helpful to run this command to ensure docker isn't holding any problematic code or issues in containers/images. This may generate some error messages, which you can safely ignore.

### help

Syntax: `pushkin help [command]`

Provides information on a specific pushkin command, you can add the command after help \(e.g. `pushkin help prep` to learn about the prep command and its options\). Defaults to a list of all commands and general information about each if no command is specified.
