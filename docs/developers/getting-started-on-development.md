# Getting started on development

## Setting up the development environment

Your first step in Pushkin development is cloning the `pushkin` repo. Your IDE (e.g. VS Code) probably has an easy means of doing this, or you can run the following command in the terminal, which will save the repo in your current working directory:

```
git clone https://github.com/pushkin-consortium/pushkin.git && cd pushkin
```

Next you'll need to install the repo's dependencies and build all packages/templates. We'll assume here that you've followed the Pushkin [installation instructions](../getting-started/installation.md#installing-node) and already have Node and Yarn installed. To install dependencies, simply run:

```
yarn install
```

The repo uses [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/), so `yarn install` will install the dependencies for all Pushkin packages and templates. Then run:

```
yarn workspaces run build
# Executes build scripts for all packages/templates
```

If you only want to build a particular package/template (e.g. you're testing updates you've made to that package), you can do that with the following command:

```
yarn workspace <package-name> build
# Equivalent to `yarn build` from the package root
```

Finally, if you're using VS Code, we recommend you install the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), so you see code suggestions as you work. Other IDEs may have equivalent extensions/plugins. Even without this extension, ESLint will still run when you commit and automatically fix style and errors when possible. 

## Repo structure

For new developers, the number and diversity of files in the `pushkin` repo might be overwhelming; this section is intended to be a brief explanation of the repo's structure. At a high level, `pushkin` uses a monorepo structure which encompasses all of the source code for the various Pushkin packages and templates, as well as for the documentation. The repo also contains various directories and files that support development and publication of the packages, templates, and docs. Click the annotations below to see descriptions of some of the repo's directories and files:

```bash
├── .changeset # (1)!
├── .github
│   └── workflows # (2)!
├── .husky
│   └── pre-commit # (3)!
├── archive # (4)!
├── docs # (5)!
├── packages # (6)!
├── templates # (7)!
│   ├── experiments # (8)!
│   └── sites # (9)!
├── .gitbook.yaml # (10)!
├── .gitignore
├── babel.config.json # (11)!
├── CITATION.cff # (12)!
├── LICENSE
├── README.md
├── SECURITY.md # (13)!
├── eslint.config.js # (14)!
├── mkdocs.yml # (15)!
├── package.json # (16)!
├── poetry.lock # (17)!
├── pyproject.toml # (18)!
└── yarn.lock # (19)!
```

1.  Pushkin uses [changesets](https://github.com/atlassian/changesets/blob/main/docs/adding-a-changeset.md) as part of our release workflow. For more information, see our [contribution guidelines](./contributions.md#contributing-to-the-codebase). Inside the `/.changesets` folder, you'll find a configuration file and possibly some changesets for upcoming releases, which always get a random `<adjective>-<noun>-<verb>.md` filename. In some cases, you may need to manually edit a changeset, but typically you'll add a new one by calling `yarn changeset`.
2.  The `/.github/workflows` folder contains YAML files that specify [GitHub Actions](https://docs.github.com/en/actions/quickstart), which automate tasks like releasing package updates on npm or welcoming new Pushkin contributors.
3.  Pushkin uses [Husky](https://typicode.github.io/husky/) for pre-commit hooks, meaning we can run certain tasks (e.g.linting and tests) every time a contributor commits.
4.  The `/archive` folder holds legacy documentation, which will likely be deleted in the future. There should be no reason to edit these files.
5.  The `/docs` folder holds the source files for the site you're currently reading! See our [documentation instructions](./documentation.md) for more information.
6.  `/packages` contains the source code for Pushkin CLI and other Pushkin packages. See the [packages overview](../packages/packages-overview.md) for more information.
7.  `/templates` contains the source code for Pushkin site and experiment templates, which are also implemented as npm packages.
8.  See the [experiment template overview](../exp-templates/exp-templates-overview.md) for more information.
9.  See the [site template overview](../site-templates/site-templates-overview.md) for more information.
10. This is a configuration file for legacy documentation, which will be deleted in the future. There should be no need to edit it until then.
11. This is the configuration file for [Babel](https://babel.dev/), which we use to transpile source code for Pushkin packages. Note this configuration file does not apply to internal packages within templates (e.g. experiments' `web page` components). Those have have their own config files, which are utilized in the user's site.
12. `CITATION.cff` is automatically picked up by GitHub and provides the preferred citation for citing Pushkin.
13. This is our security policy, which appears on [GitHub](https://github.com/pushkin-consortium/pushkin/security/policy) and this site's [security](./security.md) page.
14. This is the configuration file for [ESLint](https://eslint.org/), software that automatically corrects style and errors in our code.
15. `mkdocs.yml` is the configuration file for our documentation. You might need to edit it if you're adding new pages to the docs.
16. Pushkin uses [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/) to streamline development of all Pushkin software released on npm (i.e. everything in `/packages` and `/templates`). If you look at one of our released packages (e.g. `pushkin-cli`), it has a more typical `package.json` that (among other things) lists the package's dependencies. The root of a monorepo utilizing workspaces also needs a `package.json`, but you'll notice it is `private`, meaning it's not intended for release on npm. It contains some configuration information for workspaces and scripts that support Pushkin development. Unless you are a Pushkin maintainer, you probably shouldn't have a reason to edit this file.
17. `poetry.lock` is the Poetry equivalent of the `yarn.lock` file below. You should **not** manually edit this file.
18. Pushkin is generally a JavaScript project, so you might be surprised to see this Python-related file here; however, Pushkin uses Python via [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) to create our documentation. This file is the equivalent of a `package.json` for Python and tells the Python package manager [Poetry](https://python-poetry.org/) how to set up the build environment for our documentation. This streamlines and standardizes the process of testing and deploying our docs. Unless you are a Pushkin maintainer, you probably shouldn't have a reason to edit this file.
19. `yarn.lock` tells Yarn exactly what versions of dependencies (and dependencies of dependencies, etc.) it should install in `node_modules`. Because we are using workspaces, this lock file contains dependency information for everything in `/packages` and `/templates` (you'll notice these packages don't have lock files), in addition to the development dependencies for the whole monorepo. You should **not** manually edit this file.

## Testing development versions of Pushkin packages and templates

### Site and experiment templates

Site and experiment templates are the easiest Pushkin components to test, since the CLI includes an option to install templates from a local path. Simply follow the CLI's instructions and provide the local path to your development template. Before you test your updates, make sure you run the template's `build` script so `build/template.zip` will reflect your changes. You can do this by running `yarn workspace <name-of-template> build` from the root of the `pushkin` repo (or just `yarn build` from the root of the template itself).

### pushkin-cli

Building `pushkin-cli` will create a `/build` directory in your local copy of the package. You can call development versions of all the normal `pushkin` commands by calling `node` on `/build/index.js` and specifying which command you want. For example:

```
node <path-to-repo>/pushkin/packages/pushkin-cli/build/index.js install site
```

For ease, you might want to create your test site directory in same parent directory where you cloned the repo, so you can specify the path to the main build file like so:

```
node ../pushkin/packages/pushkin-cli/build/index.js prep
```

Don't forget to run `yarn workspace pushkin-cli build` prior to testing changes in order to update the build files. Note that you should run this command in the root of the `pushkin` repo, not your test site.

### Using yalc with Pushkin utility packages

!!! tip "Automate these processes with the `use-dev` command!"
    As of version 4.2 of the Pushkin CLI, the processes described below can be automated with [`pushkin use-dev`](../packages/pushkin-cli.md#use-dev). The descriptions below are preserved for informational and compatibility purposes.

Testing development versions of the Pushkin utility packages (`pushkin-api`, `pushkin-client`, and `pushkin-worker`) is not as straightforward as with templates or the CLI. These packages typically get installed in various locations in the user's site via npm (through commands executed by the CLI). Normally, that means you can only include published versions. We can get around this using [`yalc`](https://github.com/wclr/yalc), which you've already installed if you followed the Pushkin [installation instructions](../getting-started/installation.md#installing-yalc).

=== "pushkin-api"

    Assuming you already have a Pushkin site installed with at least one experiment in it, do the following:

    1. In your local copy of the `pushkin` repo (where presumably you have made changes to `pushkin-api`), go to `/packages/pushkin-api`. Be sure you've rebuilt the package to reflect your changes by running `yarn build`.
    2. Run `yalc publish` to create a locally published version of `pushkin-api`.
    3. Go to the `/pushkin/api` directory of your Pushkin site.
    4. Run `yalc add pushkin-api` to add your locally published version as a dependency.
    5. Go to the `/experiments/<experiment-name>/api controllers` directory of your Pushkin site.
    6. Again run `yalc add pushkin-api`.
    7. Open `package.json` in that same directory.
    8. You should see it has a property `"files"` with a value `["build/*"]`. Add `".yalc"` to the list of files like such:

    ```json
        "files": [
            "build/*",
            ".yalc"
        ],
    ```

    9. Repeat steps 5-8 for each additional experiment in your site's `/experiments` directory.

    Now you should be able to run `pushkin prep` and `pushkin start`. If you make subsequent changes to `pushkin-api`, you'll need to:

    1. Re-run `yarn build` in `pushkin/packages/pushkin-api`.
    2. In the same directory, run `yalc push`. `yalc push` will update your locally published version of `pushkin-api` and push the changes wherever the package is being used. This saves you the hassle of running `yalc update` in all the places you previously ran `yalc add`.

=== "pushkin-client"

    Assuming you already have a Pushkin site installed with at least one experiment in it, do the following:

    1. In your local copy of the `pushkin` repo (where presumably you have made changes to `pushkin-client`), go to `/packages/pushkin-client`. Be sure you've rebuilt the package to reflect your changes by running `yarn build`.
    2. Run `yalc publish` to create a locally published version of `pushkin-client`.
    3. Go to the `/pushkin/front-end` directory of your Pushkin site.
    4. Run `yalc add pushkin-client` to add your locally published version as a dependency.
    5. Go to the `/experiments/<experiment-name>/web page` directory of your Pushkin site.
    6. Again run `yalc add pushkin-client`.
    7. Open `package.json` in that same directory.
    8. You should see it has a property `"files"` with a value `["build/*"]`. Add `".yalc"` to the list of files like such:

    ```json
        "files": [
            "build/*",
            ".yalc"
        ],
    ```

    9. Repeat steps 5-8 for each additional experiment in your site's `/experiments` directory.

    Now you should be able to run `pushkin prep` and `pushkin start`. If you make subsequent changes to `pushkin-client`, you'll need to:

    1. Re-run `yarn build` in `pushkin/packages/pushkin-client`.
    2. In the same directory, run `yalc push`. `yalc push` will update your locally published version of `pushkin-client` and push the changes wherever the package is being used. This saves you the hassle of running `yalc update` in all the places you previously ran `yalc add`.

=== "pushkin-worker"

    Assuming you already have a Pushkin site installed with at least one experiment in it, do the following:

    1. In your local copy of the `pushkin` repo (where presumably you have made changes to `pushkin-worker`), go to `/packages/pushkin-worker`. Be sure you've rebuilt the package to reflect your changes by running `yarn build`.
    2. Run `yalc publish` to create a locally published version of `pushkin-worker`.
    3. Go to the `/experiments/<experiment-name>/worker` directory of your Pushkin site corresponding to the experiment for which you'd like to use the modified worker.
    4. Run `yalc add pushkin-worker` to add your locally published version as a dependency.
    5. Open `package.json` in that same directory and add the property `"files"` with a value `[".yalc"]` like such:

    ```JSON
        "files": [".yalc"],
    ```

    6. Open the `Dockerfile` in the same directory and edit it to copy yalc files:

    ```dockerfile
    COPY .yalc /usr/src/app/.yalc/
    COPY ./yalc.lock /usr/src/app/
    ```

    These lines need to come **before** `WORKDIR` is changed. So for example:

    ```dockerfile
    FROM node:20.2
    COPY Dockerfile index.js package.json start.sh yarn.lock /usr/src/app/
    COPY .yalc /usr/src/app/.yalc/
    COPY ./yalc.lock /usr/src/app/
    WORKDIR /usr/src/app
    RUN yarn install --production
    RUN apt-get update && apt-get install -qy netcat
    EXPOSE 8000
    CMD ["bash","start.sh"]
    ```

    Now you should be able to run `pushkin prep` and `pushkin start`. If you make subsequent changes to `pushkin-worker`, you'll need to:

    1. Re-run `yarn build` in `pushkin/packages/pushkin-worker`.
    2. In the same directory, run `yalc push`. `yalc push` will update your locally published version of `pushkin-worker` and push the changes wherever the package is being used. This saves you the hassle of running `yalc update` where you previously ran `yalc add`.
