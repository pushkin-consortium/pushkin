# Getting started on development

## Overview of technologies

Below is a non-exhaustive list of technologies in the Pushkin stack. Depending on what you're trying to develop some of these may be absolutely essential or less important. In some cases, we suggest learning resources. If you find other resources that are particularly helpful, please make a pull request to update this page!

### Front-end

- **HTML:** A basic building block of websites, most HTML in a Pushkin site lives in conjunction with React tags.
- **CSS:** How stylings for websites are often declared. Pushkin currently uses a combination of CSS and JS to set the stylings.
- **React:** A JavaScript library for building interactive user interfaces and single-page applications (SPAs). Pushkin creates your site as an SPA using React.
    - You’ll want a reasonably thorough grounding in Javascript and React (especially important for working with site templates). We recommend the Codecademy.com [Learn React](https://www.codecademy.com/learn/react-101) course.
    - For a gentle introduction to SPAs, read this [tutorial](https://auth0.com/blog/beyond-create-react-app-react-router-redux-saga-and-more/), which also describes incorporating authentication with Auth0. Note that this tutorial is slightly out of date in that Auth0 now uses auth0-spa-js for SPAs, and create-react-app suggests using function components rather than class components.
- **React-Router:** Handles navigation components for setting your page URLs in your SPA.
    - To work with site templates, you probably want to learn more about routing using React-Router. We use [v5](https://reacttraining.com/blog/react-router-v5/), which is nearly identical to v4. If you read up on React Router, you’ll see a lot of [discussion of dynamic routing](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/guides/philosophy.md), though you can probably safely ignore this. One of the better tutorials available is [here](https://auth0.com/blog/react-router-4-practical-tutorial/), though it’s a bit short.
- **Redux:** Redux is used to keep track of application-level state variables. In the case of Pushkin, we use React-Redux. A primary use case is keeping track of subject IDs.
    - The best tutorial we’ve found for React-Redux is [the official one](https://redux.js.org/basics/basic-tutorial). Note that it’s a little out-of-date with regards to the use of object spread syntax (which is now supported by Node) and with how to handle asynchronous requests, for which we use [redux sagas](https://redux-saga.js.org/docs/introduction/). A good place to start on why redux sagas are worth using is [here](https://engineering.universe.com/what-is-redux-saga-c1252fc2f4d1).
- **jsPsych:** jsPsych creates the experiments themselves within the Pushkin site and collects participants' data.
    - A solid grasp of jsPsych is essential for developing experiment templates. We recommend consulting their [documentation](https://www.jspsych.org).
- **Bootstrap:** A framework for building responsive websites that adapt across devices. This includes features like navigation bars and buttons that easily adapt to different window dimensions. In the case of Pushkin, we use React-Bootstrap, which integrates Bootstrap styling into the React SPA.
- **Aphrodite:** Adds JavaScript-based styling (to update CSS) for React components. Currently, this is used to customize hover styling for the QuizTile icons and buttons but can be imported into other components to add more control over the styling via JavaScript.

### Back-end and database

- **Node:** The language of the back end. This is used to set up the APIs, set up the server for the site, and more.
    - You’ll need a decent understanding of Javascript and Node for doing development on the Pushkin CLI.
- **SQL:** Used to manage the site databases, such as user information and experiment data. Pushkin is designed to use PostgreSQL.
- **Knex:** A SQL query builder for building, updating, and interacting with Pushkin databases.
- **RabbitMQ:** A message broker for validation and routing. Routes messages from the API controller for the worker to receive.

### Other
- **Docker:** A platform for developing, shipping, and running applications. Used for testing your Pushkin site locally and deploying it.
    - There are a number of tutorials out there on Docker. For ongoing use, this [cheatsheet](https://www.digitalocean.com/community/tutorials/how-to-remove-docker-images-containers-and-volumes) is pretty useful.
- **Babel:** Compiles the JavaScript used in the Pushkin project to ensure browser compatibility. This means having the ability to use modern JavaScript without losing accessibility for visitors on older browsers.
- **Auth0:** The service used for authorization to enable logins for site visitors.
- **Jest:** A JavaScript testing framework. The Pushkin team uses Jest in development of Pushkin packages and templates, but users can also add it to their Pushkin sites and develop their own tests.

## Testing development versions of Pushkin packages and templates

All development tasks are going to start by cloning the `pushkin` repo and running `yarn install` from the root. The repo uses [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/), so `yarn install` will install the dependencies for all Pushkin packages and templates. At this point, you can run either:

```
yarn workspaces run build
# Execute build scripts for all packages and templates
```

or

```
yarn workspace <package-name> build
# Build only the particular workspace you're testing
# (equivalent to `yarn build` from the package root)
```

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

Testing development versions of the Pushkin utility packages (`pushkin-api`, `pushkin-client`, and `pushkin-worker`) is not as straightforward as with templates or the CLI. These packages typically get installed in various locations in the user's site via npm (through commands executed by the CLI). Normally, that means you can only include published versions. We can get around this using [`yalc`](https://github.com/wclr/yalc), which you've already installed if you followed the Pushkin [installation instructions](../getting-started/installation.md#installing-yalc).

#### pushkin-api

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

#### pushkin-client

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

#### pushkin-worker

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

## Testing with Jest

The pushkin repo is set up to run tests using [Jest](https://jestjs.io/), a popular JavaScript testing library. In addition to testing contributions to the Pushkin codebase, Jest is also configured for Pushkin users to run tests on their own Pushkin sites.

### Jest for pushkin repo development

After cloning the `pushkin` repo and running `yarn install`, you can run tests for all Pushkin packages and templates by running:

```
yarn test
```

Alternatively, to run tests for just one particular package or template, run:

```
yarn workspace <workspace-name> test
```

Improving test coverage is a priority for Pushkin, so we will happily receive pull requests for additional tests. If you're contributing to some other aspect of the codebase, we ask that you try to add appropriate tests to cover your updates (see our guide to [contributions](./contributions.md) for more).

### Jest for user site development

Pushkin sites come pre-configured to run Jest tests. Currently, the only tests distributed to Pushkin users enter your site through two areas:

1. **Experiment Templates**: Tests in the experiment templates primarily focus on validating the jsPsych timeline that is essential to experiment functionality
2. **Site Templates**: Currently, [site-basic](../site-templates/site-basic.md) has multiple tests focusing on rendering site components

You can expand testing for your Pushkin site as you see fit. If you develop more sophisticated testing for your site, we encourage you to consider how it could be contributed back to the project, so other users might benefit as well.

After running `pushkin install exp`, run `yarn test` from the root of your site to run tests for what you've installed. Note that some tests written for experiment templates and/or frontend components may fail when you customize them. 