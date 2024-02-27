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

**Syntax:**

```
pushkin install site <options>
```

or

```
pushkin i site <options>
```

**Options:**

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

- verbose: `-v` or `--verbose` shows additional console output during the installation process which may be helpful for debugging.

- help: `-h` or `--help` displays the command's help information.

**Details:**

If you select the basic template, this command will give you the option to import an existing jsPsych experiment (note that the latest basic template and thus this feature only support jsPsych 7+). This feature assumes a workflow where you first implement the basics of your experiment design as a standalone jsPsych experiment, which is a bit faster to test, before turning it into a Pushkin experiment. This feature is covered in detail in the documentation for the [basic experiment template](../exp-templates/exp-basic.md#importing-a-jspsych-experiment).

`install experiment` generally works by adding the experiment template of your choosing as a dependency to your site. Template contents then get unzipped into the experiment's dedicated directory and are further manipulated by the CLI.

The command also integrates a new experiment into the Pushkin framework. It performs key tasks such as updating template file names and contents to reflect the new experiment's name, setting up database migrations, initializing essential directories for the experiment's API, web page, and worker components, and ensuring the experiment is correctly configured in the Docker environment. The API and web page components are then locally published using yalc.

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

- no-migrations: `--nomigrations` will run `prep` without database migrations. If you do this, make sure the database structure has not changed since you ran `prep` previously (with migrations).

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

- no-cache: `--nocache` will rebuild all Docker images from scratch without using the cache. By default, this is false.

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

### help

Provides help information for `pushkin` commands.

**Syntax:**

```
pushkin help <command>
```

**Arguments:**

- **command:** string

    Add the command after `help` (e.g. `pushkin help prep` to learn about the `prep` command and its options). Defaults to a list of all commands and general information about each if no command is specified.