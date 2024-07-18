# pushkin-cli

## Installation

We recommend installing the Pushkin command-line interface globally for ease of setting up your Pushkin site:

```
 yarn global add pushkin-cli
```

### Updating pushkin-cli

To update Pushkin CLI to the most recently released version, run:

```
 yarn global upgrade pushkin-cli --latest
```

## Commands

### config

View the config file for your site or any of the installed experiments. 

**Syntax**

```
pushkin config <what>
```
**Arguments**

- **what:** string

    Can be `site` or the name of any of the installed experiments. If omitted, all config files are shown.

### install site

This command uses a template to set up the file structure of your site in the current working directory. You will be prompted to select which template and version you want. Typically, the latest version will be the best option. You also have options to install a template from an arbitrary npm package(1) or from a local path. The latter option is particularly useful for developing your own site templates and for using unreleased development versions of templates.
{ .annotate }

1. Of course, this will only work if the package is properly set up to function as a Pushkin site template.

??? question "How can I work on multiple Pushkin sites simultaneously?"
    When running Pushkin on your local system, you can only work on a single Pushkin site at a time. For most users, this shouldn't present a problem, since additional experiments can always be added to a site; however, if you do need to work on multiple sites simultaneously, using [GitHub Codespaces](../getting-started/installation.md#github-codespaces) will allow you to keep your sites in separate virtual environments.

**Syntax:**

```
pushkin install site <options>
```

or

```
pushkin i site <options>
```

**Options:**

Except for the `--verbose` and `--help` flags, the other options for `install site` are intended to allow the command to be run without the need for interactive prompts, which is useful for automating site creation.

- template: `--template <template_name>` allows you to specify a published site template from the command line instead of choosing interactively.
    - Use the full name of the package as published on npm, e.g. `@pushkin-templates/site-basic`.
    - This option is incompatible with the `--path` option.
    - If you do not specify a version of the template with the `--release` option, the version tagged `latest` will be used by default.

- path: `--path <path/to/template>` allows you to specify the path to a local site template from the command line instead of entering it interactively.
    - This option is incompatible with the `--template` and `--release` options.

- release: `--release <version_or_tag>` allows you to specify the release number or tag of a published site template from the command line instead of entering it interactively.
    - This option is incompatible with the `--path` option.

- verbose: `-v` or `--verbose` shows additional console output during the installation process which may be helpful for debugging.

- help: `-h` or `--help` displays the command's help information.

**Details:**

In general, it's a best practice to install your Pushkin site in a new directory. The CLI will ask you to confirm the installation if there are already contents in your working directory. In some cases you may wish to install a site into a directory that already has some contents, e.g. if the directory has already been initialized as a git repository and has a `/.git` directory.

`install site` generally works by initializing your site directory as a private npm package so Pushkin templates can be added as dependencies. Template contents then get unzipped into your site directory and are further manipulated by the CLI.

`install site` also sets up your Pushkin site’s test transactions database, a test version of the eventual production transactions database. The command reviews the presence of configuration files `pushkin/docker-compose.dev.yml` and `pushkin.yaml`. These configurations detail the database setup, including parameters such as ports and passwords. Should necessary configurations for the test transaction database be absent, the command establishes them automatically. 

The transactions database, like all Pushkin databases, uses PostgreSQL and Knex migrations. Migration files serve as blueprints for database tables. If migration files for the transactions database are missing, the command automatically establishes a standard structure for it.

`install site` also does some initial dependency installation and building for the `/pushkin/front-end` and `/pushkin/api` components.

### install experiment

This command helps users set up a new experiment using a Pushkin experiment template. You will be prompted to select which template and version you want. Typically, the latest version will be the best option. You also have options to install a template from an arbitrary npm package(1) or from a local path. The latter option is particularly useful for developing your own experiment templates and for using unreleased development versions of templates.
{ .annotate }

1. Of course, this will only work if the package is properly set up to function as a Pushkin experiment template.

**Syntax:**

```
pushkin install experiment <options>
```

or

```
pushkin i exp <options>
```

**Options:**

Except for the `--verbose` and `--help` flags, the other options for `install experiment` are intended to allow the command to be run without the need for interactive prompts, which is useful for automating site creation.

- expName: `--expName <experiment_name>` allows you to specify a name for the experiment from the command line instead of entering it interactively.

- template: `--template <template_name>` allows you to specify a published experiment template from the command line instead of choosing interactively.
    - Use the full name of the package as published on npm, e.g. `@pushkin-templates/exp-basic`.
    - This option is incompatible with the `--path` option.
    - If you do not specify a version of the template with the `--release` option, the version tagged `latest` will be used by default.

- path: `--path <path/to/template>` allows you to specify the path to a local experiment template from the command line instead of entering it interactively.
    - This option is incompatible with the `--template` and `--release` options.

- release: `--release <version_or_tag>` allows you to specify the release number or tag of a published experiment template from the command line instead of entering it interactively.
    - This option is incompatible with the `--path` option.

- expImport: `--expImport <path/to/experiment>` allows you to specify a path to a jsPsych experiment which you'd like to import into the basic experiment template.
    - Just like importing a jsPsych experiment interactively, this option is only applicable to the basic experiment template.
    - This option is implied `false` if you use the `--template`, `--path`, or `--release` flags. If you're using any of those flags and want to import a jsPsych experiment, you must use the `--expImport` option; there will not be an interactive prompt.

- all: `-a <source>` or `--all <source>` installs all available experiment templates from a given source in a single command. The source can be either `latest` or the path to the experiment templates folder of a local clone of the `pushkin` repo. This option facilitates automated and manual testing procedures in which you want to test an update's effect on all templates.
    - If running `--all latest`, the latest version of all experiment templates under the `@pushkin-templates` scope will be installed from npm. The names of the experiments will be the template name minus `@pushkin-templates/exp-` with `_latest` appended.
    - If running `-all <path>`, the development versions of templates from the local `pushkin` repo will be used. The path must end in `pushkin/templates/experiments`. The names of the experiments will be the names of the directories in the experiment templates folder with `_path` appended.
    - This option is incompatible with all other options except `--verbose`.

- verbose: `-v` or `--verbose` shows additional console output during the installation process which may be helpful for debugging.

- help: `-h` or `--help` displays the command's help information.

**Details:**

If you select the basic template, this command will give you the option to import an existing jsPsych experiment (note that the latest basic template and thus this feature only support jsPsych 7+). This feature assumes a workflow where you first implement the basics of your experiment design as a standalone jsPsych experiment, which is a bit faster to test, before turning it into a Pushkin experiment. This feature is covered in detail in the documentation for the [basic experiment template](../exp-templates/exp-basic.md#importing-a-jspsych-experiment).

`install experiment` generally works by adding the experiment template of your choosing as a dependency to your site. Template contents then get unzipped into the experiment's dedicated directory and are further manipulated by the CLI.

The command also integrates a new experiment into the Pushkin framework. It performs key tasks such as updating template file names and contents to reflect the new experiment's name, setting up database migrations, initializing essential directories for the experiment's API, web page, and worker components, and ensuring the experiment is correctly configured in the Docker environment. The API and web page components are then locally published using yalc.

### remove experiment

This command allows users to remove an experiment from their site and offers three removal modes:

1. **delete:** Deleting an experiment permanently removes all of its files, data, and associated Docker components. This command should only be used if you want the experiment completely gone, as it is irreversible. Note that this mode currently runs [`kill`](#kill), and will consequently delete **all** experiments' data from your local database, not just the experiment(s) you deleted. Future development may address this limitation.
2. **archive:** Archiving an experiment removes it from your site's front end, so it is no longer accessible to participants. However, all of the experiment's files remain in place and the site's back end and data will not be affected.
3. **pause-data:** Pausing data collection means that the front end of the experiment stays accessible, but no data from subsequent runs of that experiment will be saved to the Pushkin database. When data collection is paused, an additional trial is added to the beginning of the experiment informing potential participants that no data will be collected.

The `archive` and `pause-data` modes have complementary modes `unarchive` and `unpause-data` which respectively restore an archived experiment to the front end and resume data collection. The `delete` mode has no such complement, since it is permanent.

!!! note
    You must run [`prep`](#prep) after `remove experiment` for the changes to your site to take effect.

**Syntax:**

```
pushkin remove experiment <options>
```

or

```
pushkin rm exp <options>
```

**Options:**

- experiments: `-e` or `--experiments` allows you to specify which experiment(s) to delete, archive, or unarchive. Provide the experiments' short names (i.e. the name of the folder in the `/experiments` directory) separated by spaces after the `-e` flag (e.g. `pushkin rm exp -e exp1 exp2 exp3`). If the `--experiments` option is omitted, the CLI will interactively prompt you to select the experiments you want.

- mode: `-m` or `--mode` allows you to specify the `delete`, `archive`, `unarchive`, `pause-data`, or `unpause-data` mode (e.g. `pushkin rm exp -m delete`). If the `--mode` option is omitted, the CLI will interactively prompt you to select which mode you want.

- force: `-f` or `--force` applies only to the `delete` mode and allows you to suppress the deletion confirmation prompt.

- verbose: `-v` or `--verbose` shows additional console output during the removal process which may be helpful for debugging.

- help: `-h` or `--help` displays the command's help information.

**Details:**

All that results from calling `remove experiment` in the `archive` or `pause-data` mode (as well as their opposite modes) is that the experiment's `config.yaml` file will be updated with respect to the boolean property `archived` or `dataPaused`. You can change this property manually if you wish, but using `pushkin rm exp -m archive` or `pushkin rm exp -m pause-data` offers a convenient way to quickly change this property for multiple experiments.

### updateDB

Runs migrations and seeds for experiments to update the database. This is set up to ensure experiments using the same database (as defined in `pushkin.yaml`) are migrated at the same time to avoid errors with the `knex_migrations` table. This is automatically run as part of `pushkin prep`.

**Syntax:**

```
pushkin updateDB
```

### prep

Run inside a Pushkin project to prepare Pushkin to be run for local testing. Packages generated by yarn inside each experiment’s web page and api controllers directories are moved to the core Pushkin code, installed there, and linked to the core code. Previous modules are uninstalled and removed.

**Syntax:**

```
pushkin prep <options>
```
**Options:**

- no-migrations: `--no-migrations` will run `prep` without database migrations. If you do this, make sure the database structure has not changed since you ran `prep` previously (with migrations).

- verbose: `-v` or `--verbose` shows additional console output which may be helpful for debugging.

- help: `-h` or `--help` displays the command's help information.

**Details:**

The code for `prep` is a bit convoluted (sorry). It loops through each experiment in the experiments folder (as defined by `pushkin.yaml`). For each experiment, it does the following:

- builds and locally publishes the experiment's api controllers and web page components. These are then added to the site's core API and front-end packages, respectively.
- compiles the experiment's worker and then builds a Docker image for it. It is then added to `docker-compose.dev.yml` so that docker knows to include it when the website is built.
- updates `pushkin/front-end/src/experiments.js` to list the experiment, along with key information from its config file. This will be read by the front end to build the list of experiments to display to potential participants.

Additionally, `prep` builds the other docker images for remaining components of the Pushkin site, including the main database, the transactions database, the API, and the front end.

### start

Starts the local deploy of your Pushkin site for debugging purposes.

**Syntax:**

```
pushkin start <options>
```

**Options:**

- no-cache: `--no-cache` will rebuild all Docker images from scratch without using the cache. By default, this is false.

- verbose: `-v` or `--verbose` shows additional console output which may be helpful for debugging.

- help: `-h` or `--help` displays the command's help information.

### stop

Stops the local deploy. This will not remove the local Docker images. To do that, see [`pushkin kill`](#kill) and [`pushkin armageddon`](#armageddon).

**Syntax:**

```
pushkin stop
```

### kill

Removes all containers and volumes from local Docker, as well as pushkin-specific images. Sometimes, if you're having issues developing or seeing updates to your Pushkin project, it may be helpful to run this command to ensure docker isn't holding any problematic code or issues in containers.

**Syntax:**

```
pushkin kill
```

### armageddon

Performs a complete reset of local Docker, including containers, volumes, and third-party images. Sometimes, if you're having issues developing or seeing updates to your Pushkin project, it may be helpful to run this command to ensure docker isn't holding any problematic code or issues in containers/images. This may generate some error messages, which you can safely ignore.

**Syntax:**

```
pushkin armageddon
```

### use-dev

Substitutes a local development version of the specified Pushkin utility package(s) (`pushkin-api`, `pushkin-client`, and/or `pushkin-worker`). You can also use this same command to revert to the previously used published version of the package (see the `--revert` option below).

**Syntax**

```
pushkin use-dev api client worker --path <path/to/packages>
```

**Arguments**

Add the Pushkin utility packages for which you want to substitute a local development version as arguments. The `pushkin-` prefix is optional when specifying these packages, so `pushkin use-dev pushkin-client` and `pushkin use-dev client` are equivalent.

**Options**

- path: `-p` or `--path <path/to/packages>` is required to specify the path to the `packages` directory in your local clone of the `pushkin` repo. This option is required in all cases, except when reverting to a published version with the `--revert` option (in which case, `--path` is invalid).

- experiments: `-e` or `--experiments <experiments>` allows you to specify for which experiment(s) you want to use a dev version of `pushkin-worker`. Enter the experiments' short names (i.e. the names of the directories in `/experiments`) following the option flag, e.g. `-e exp1 exp2 exp3`.
    - Only workers can be experiment-specific; therefore the command `pushkin use-dev api client worker -p <path> -e <exp1_of_3>` will change the worker for one of three experiments, but `pushkin-api` and `pushkin-client` for the entire site.
    - If this option is not used, `pushkin use-dev worker` updates all experiments' workers.
    - This option is invalid if used without `worker` or `pushkin-worker` as an argument.

- update: `-u` or `--update` allows you to push additional local updates to the specified Pushkin utility package(s) in your site. For this command to work, you must already be using a local development version of all the specified packages (it is basically a wrapper around `yalc push`).
    - You don't need to use this option to update development versions; it may just run incrementally faster. For instance, if you're already using a local development version of `pushkin-api` and now want to do the same for `pushkin-client`, `pushkin use-dev api client -p <path>` will update your site with any changes made to `pushkin-api` and add the local version of `pushkin-client`.

- revert: `--revert` undoes the changes to your site that are otherwise implemented by the `use-dev` command. It subsitutes the previously used published version of the specified package(s).
    - In order for this option to function correctly, you must have originally installed the development version(s) with the `use-dev` command (rather than manually).
    - The `--revert` option uses a file in the particular site component directory called `.<package>-revert-version` to store the previously used published version of the package. This file is written when you run `use-dev` normally, but reverting will fail if it doesn't exist.

- verbose: `-v` or `--verbose` shows additional console output which may be helpful for debugging.

**Details**

The `use-dev` command essentially automates the manual procedure described [here](../developers/getting-started-on-development.md#using-yalc-with-pushkin-utility-packages) for using development versions of Pushkin utility packages. The one additional thing it does is to write files called `.<package>-revert-version` to the relevant compenent directories of your site to store the previously used published version of that package. This file enables you to revert to the published version using the `--revert` option.

### help

Provides help information for `pushkin` commands.

**Syntax:**

```
pushkin help <command>
```

**Arguments:**

- **command:** string

    Add the command after `help` (e.g. `pushkin help prep` to learn about the `prep` command and its options). Defaults to a list of all commands and general information about each if no command is specified.