# pushkin-cli

### installation

The Pushkin command-line package is available via **Yarn**. We highly recommend a global install in order to make working with Pushkin projects as easy as possible:

```bash
 yarn global add pushkin-cli
```

#### update

To update the Pushkin CLI to the most recently released version, run:

```bash
 yarn global upgrade pushkin-cli --latest
```

Any subcommand that affects a specific project must be run from a folder inside the project you wish to modify.

The CLI has the following subcommands:

### config

Syntax: `pushkin config [what]`

View config file for _**what**_, replacing **_what_** with **_site_** or any of the installed experiments by name. Defaults to all.

### install site

```bash
pushkin install site
```
The `install site` command uses a website template to set up the file structure of your site in the current working directory. You will be prompted to select which template you want, and then which version. Typically, the latest version will be the best option. You also have the option to select `url`, enabling you to use a Pushkin site template released on GitHub but not part of the main Pushkin distribution, or to select `path`, enabling you to use a site template on your local system. The `path` option is particularly useful for developing your own site templates and for using unreleased development versions of templates.

**optional arguments**

- verbose: `pushkin install site --verbose` shows additional console output during the installation process which may be helpful for debugging.

- help: `pushkin install site --help` displays the command's help information.

**details**

The behavior of `install site` initially depends on which type of template you select. 

1. Pre-built templates: If you select one of the pre-built templates included in the Pushkin distribution (currently only `basic`, but additional site templates will be added in the future), the command will look for the versions of that template released on GitHub and ask you to pick one. 

2. URL option: Selecting the `url` option does essentially the same thing but looks at the repo of your choosing instead of one of the official Pushkin ones. Once you select the version that you want, the command downloads the template from GitHub and installs it in your current working directory. 
Path option: The process is similar to choosing a template from a url when you choose `path`, but the template contents are copied from the specified path instead of downloaded.

`install site` also sets up your Pushkin site’s test transaction database. The command reviews the presence of configuration files: `pushkin/docker-compose.dev.yml` and `pushkin.yaml`. These configurations detail the database setup, including parameters such as ports and passwords. Should the necessary configurations for the Test Tra nsaction Database be absent, the command establishes them automatically. 

The 'test transaction database' can be conceptualized as a sandbox environment, enabling experimentation, query testing, and simulated operations without risks to live data. This database provides a controlled environment for thorough verification before moving to production. This database is simply a test version of the main transaction database. A pushkin site has multiple databases for each experiment, as well an overarching transaction database.

PostgreSQL, a widely-used relational database system, is employed in the test transaction database. The structure or format of required database tables is dictated by Knex migrations. These migrations serve as blueprints for database tables. If migration files for the transactions table are missing, the command autonomously establishes a foundational structure for it, guaranteeing a uniform schema for testing.

Other stuff `install site` does:
Writes the front-end environment variable and configuration file
Installs dependencies for `pushkin/front-end` and `pushkin/api` and builds those components


### install experiment

```bash
pushkin install experiment
```

The `install experiment` command helps users set up a new experiment using one of the available Pushkin experiment templates. Upon executing this command, you will be prompted to name your experiment and select an experiment template. Depending on the chosen method (`path`, `url`, or a pre-built template), the command will either download the chosen template or copy it from the provided path, creating a directory with the given experiment name.

**optional arguments**

- verbose: `pushkin install experiment --verbose` provides additional console output, useful for debugging.
  
- help: `pushkin install experiment --help` displays the command's help information.

**template choices:**

1. Pre-built templates: Select from available experiment templates included in the Pushkin distribution.
   
2. URL templates: Provide a URL to a GitHub repository containing an experiment template. The command fetches the list of available versions and prompts for selection.
   
3. Path templates: Specify the absolute path to a local directory with the experiment template, and the command will copy from there.

The command also integrates a new experiment into the Pushkin framework. It performs key tasks such as updating file strings to reflect the new experiment's name, setting up database migrations, initializing essential directories for the experiment's API, webpage, and worker, and ensuring the experiment is correctly configured in the Docker environment.  The API and webpage components are then published using yalc. The command also manages the listing of API controllers to prevent overlaps.

#### Details of importing an existing jsPsych experiment

Selecting the basic template (v5+) will give you the option to import an existing jsPsych experiment (note that the latest basic template and thus this feature only support jsPsych 7+). This feature assumes a workflow where you first implement the basics of your experiment design as a standalone jsPsych experiment, which is a bit faster to test, before turning it into a Pushkin experiment. This feature executes two tasks: (1) identifying which jsPsych plugins you're using and (2) extracting the code which builds up the experiment's timeline. In order for these tasks to be sucessful, keep the following in mind:

**plugin identification**

- Only jsPsych plugins available via npm can be added automatically (any package scoped under [@jspsych](https://www.npmjs.com/org/jspsych), [@jspsych-contrib](https://www.npmjs.com/org/jspsych-contrib), or [@jspsych-timelines](https://www.npmjs.com/org/jspsych-timelines)). Custom plugins can still be used in your experiment, but you'll need to add them manually, as described in the [overview of experiment templates](../exp-templates/exp-templates-overview.md#adding-custom-jspsych-plugins).
- Your experiment.html must use CDN-hosted plugins or import the plugins from npm. Plugins which you've downloaded and are hosting yourself will not be added automatically. See [jsPsych's documentation](https://www.jspsych.org/7.3/tutorials/hello-world/) for details.
- If your experiment.html specifies a specific version of a plugin, `pushkin install experiment` records the version number or tag in a comment after the import statement in experiment.js. This comment, if present, is later read by `pushkin prep` in order to add that particular version to your experiment. Before running `prep`, you may edit the version number in order to change the version in your experiment, but be careful not to change the format of the comment.
- If you you've forgetten to import a plugin in experiment.html, it won't be added to your Pushkin experiment. In this case, your experiment.html wouldn't be running, so you should hopefully be aware of the problem before trying to import the experiment into Pushkin.
- Likewise, if you import any extraneous plugins that aren't being used in experiment.html, they will also be added to your Pushkin experiment.

**timeline extraction**

- This feature works simply by looking for the argument you provide to `jsPsych.run()` and copying everything from where that variable is declared until before `jsPsych.run()` is called. Consequently, the argument of `jsPsych.run()` must be the _name_ of an array of timeline objects, not the array itself.
- Likewise, whatever you name the argument of `jsPsych.run()`, it must be declared before any of its component timeline objects are created. This is fairly standard practice, as something like `const timeline = [];` is usually near the top of most jsPsych experiments.
- Your experiment's equivalent to `const timeline = [];` can't come before initializing jsPsych (i.e. `const jsPsych = initJsPsych();`). You don't want to call `initJsPsych()` in a Pushkin experiment.js (rather, it's called in index.js).
- Any specifications for your stimuli must be created inside your experiment.html between the two lines of the script mentioned above. If your stimuli rely on other files, you'll need to add them manually as described in the [overview of experiment templates](../exp-templates/exp-templates-overview.md#adding-static-assets). This includes non-inline CSS styling (see the [lexical decision template](../exp-templates/exp-lexical-decision.md) for how to include custom CSS in the experiment.css file).

### updateDB

Syntax: `pushkin updateDB`

Runs migrations and seeds for experiments to update the database. This is set up to ensure experiments using the same database \(as defined in `pushkin.yaml`\) are migrated at the same time to avoid errors with the knex_migrations table. This is automatically run as part of `pushkin prep`

### prep

Syntax: `pushkin prep`

Run inside a Pushkin project to prepare Pushkin to be run for local testing. Packages generated by yarn inside each experiment’s web page and api controllers directories are moved to the core Pushkin code, installed there, and linked to the core code. Previous modules are uninstalled and removed.

The command `pushkin prep` has three optional arguments: `--nomigrations`, `--verbose`, and `--help`.

Run `pushkin prep --nomigrations` if you do not want to run migrations. If you do this, make sure the database structure has not changed.

Run `pushkin prep --verbose` to see additional console output which may be helpful for debugging.

Running `pushkin prep --help` will display help for the command.

#### Details

The code for `prep` is a bit convoluted \(sorry\). It loops through each experiment in the experiments folder \(as defined by `pushkin.yaml`\). For each experiment, it does the following:

- It compiles and then tarballs the api controllers. These are moved to `pushkin/api/tempPackages`. This package is then added as a local package to `pushkin/api/package.json`, which allows them to be called during production.
- It compiles the worker and then builds a docker image for it. It is then added to `docker-compose.dev.yml` so that docker knows to include it when the website is built.
- It compiles and tarballs `web page` and moves it to `pushkin/front-end/tempPackages`. This package is then added as a local package to `pushkin/front-end/tempPackages`.

Finally, it updates `pushkin/front-end/src/experiments.js` to list each experiment, along with key information from the experiment’s config file. This will be read by the front end to build the list of experiments to display to potential participants.

Note that before any of this happens, `prep` actually goes through and deletes all old tempPackages, cleans up the package.jsons and docker-compose-dev.yml, and empties experiments.js. Thus, to delete an experiment, all you have to do is delete its folder from the experiment folder. \(Of course, that won’t get rid of the docker image for the worker, so you’ll need to clean those up by hand periodically.\)

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
