# pushkin-cli

## Skip to section

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

Syntax: `pushkin install site`

Downloads Pushkin site template. It first will prompt for which site template, then which version. Most often, the latest version will be the best option.

The command `pushkin install site` has two optional arguments: `--verbose` and `--help`.

Run `pushkin install site --verbose` to see additional console output which may be helpful for debugging.

Running `pushkin install site --help` will display help for the command.

### install experiment

Syntax: `pushkin install experiment`

Downloads an experiment template. First will prompt for which experiment template \(see current list [here](modifying-experiment-templates/README.md#current-templates)\), then prompt for a version to be selected. Most often, the latest version will be the best option.

If you select the basic template, you will also be asked if you want to import a plain jsPsych experiment.html. If you answer 'yes', a new experiment.js will be automatically generated from the provided file. If you answer 'no', experiment.js will remain as a "Hello, world!" example.

The command `pushkin install experiment` has two optional arguments: `--verbose` and `--help`.

Run `pushkin install experiment --verbose` to see additional console output which may be helpful for debugging.

Running `pushkin install experiment --help` will display help for the command.

#### Details of importing an existing jsPsych experiment

Selecting the basic template (v5+) will give you the option to import an existing jsPsych experiment (note that the latest basic template and thus this feature only support jsPsych 7+). This feature assumes a workflow where you first implement the basics of your experiment design as a standalone jsPsych experiment, which is a bit faster to test, before turning it into a Pushkin experiment. This feature executes two tasks: (1) identifying which jsPsych plugins you're using and (2) extracting the code which builds up the experiment's timeline. In order for these tasks to be sucessful, keep the following in mind:

- **Plugin identification**

  - Only jsPsych plugins available via npm can be added automatically (any package scoped under [@jspsych](https://www.npmjs.com/org/jspsych), [@jspsych-contrib](https://www.npmjs.com/org/jspsych-contrib), or [@jspsych-timelines](https://www.npmjs.com/org/jspsych-timelines)). Custom plugins can still be used in your experiment, but you'll need to add them manually, as described [here](./modifying-experiment-templates/README.md#adding-custom-jspsych-plugins).
  - Your experiment.html must use CDN-hosted plugins or import the plugins from npm. Plugins which you've downloaded and are hosting yourself will not be added automatically. See [jsPsych's documentation](https://www.jspsych.org/7.3/tutorials/hello-world/) for details.
  - If your experiment.html specifies a specific version of a plugin, `pushkin install experiment` records the version number or tag in a comment after the import statement in experiment.js. This comment, if present, is later read by `pushkin prep` in order to add that particular version to your experiment. Before running `prep`, you may edit the version number in order to change the version in your experiment, but be careful not to change the format of the comment.
  - If you you've forgetten to import a plugin in experiment.html, it won't be added to your Pushkin experiment. In this case, your experiment.html wouldn't be running, so you should hopefully be aware of the problem before trying to import the experiment into Pushkin.
  - Likewise, if you import any extraneous plugins that aren't being used in experiment.html, they will also be added to your Pushkin experiment.

- **Timeline extraction**

  - This feature works simply by looking for the argument you provide to `jsPsych.run()` and copying everything from where that variable is declared until before `jsPsych.run()` is called. Consequently, the argument of `jsPsych.run()` must be the _name_ of an array of timeline objects, not the array itself.
  - Likewise, whatever you name the argument of `jsPsych.run()`, it must be declared before any of its component timeline objects are created. This is fairly standard practice, as something like `const timeline = [];` is usually near the top of most jsPsych experiments.
  - Your experiment's equivalent to `const timeline = [];` can't come before initializing jsPsych (i.e. `const jsPsych = initJsPsych();`). You don't want to call `initJsPsych()` in a Pushkin experiment.js (rather, it's called in index.js).
  - Any specifications for your stimuli must be created inside your experiment.html between the two lines of the script mentioned above. If your stimuli rely on other files, you'll need to add them manually as described [here](./modifying-experiment-templates/README.md). This includes non-inline CSS styling (see the [lexical decision template](./modifying-experiment-templates/lexical-decision-template.md) for how to include custom CSS in the experiment.css file).

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
