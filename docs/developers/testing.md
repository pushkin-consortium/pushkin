# Testing

## Jest (unit/integration) testing

The pushkin repo is set up to run tests using [Jest](https://jestjs.io/), a popular JavaScript testing library. In addition to testing contributions to the Pushkin codebase, Jest is also configured for Pushkin users to run tests on their own Pushkin sites.

### For pushkin repo development

!!! bug "Tests failing with 'invalid hook call' warning?"
    If you install or upgrade any dependencies in the front-end component of a site template (e.g. `templates/sites/basic/src/pushkin/front-end`), some of the site template tests will fail, and you'll see a number of errors, including "invalid hook call". This occurs because of duplicate copies of React in your top-level `node_modules` and `node_modules` in the front-end component (see [here](https://legacy.reactjs.org/warnings/invalid-hook-call-warning.html#duplicate-react)). To resolve this issue, simply delete `node_modules` **from the front-end component**. This guidance applies only to the **development** environment, where these dependencies are not needed.

After cloning the `pushkin` repo and running `yarn install`, you can run tests for all Pushkin packages and templates by running:

```
yarn test
```

Alternatively, to run tests for just one particular package or template, run:

```
yarn workspace <workspace-name> test
```

Improving test coverage is a priority for Pushkin, so we will happily receive pull requests for additional tests. If you're contributing to some other aspect of the codebase, we ask that you try to add appropriate tests to cover your updates (see our guide to [contributions](./contributions.md) for more).

### For user site development

Pushkin sites come pre-configured to run Jest tests. Tests enter your site from two sources:

1. **Site templates**: Currently, the [basic site template](../site-templates/site-basic.md) has multiple tests focusing on rendering site components and integration tests for your experiments.
2. **Experiment templates**: Tests in the experiment templates focus primarily on checking that the jsPsych timeline runs and outputs the expected data.

To run tests on your local Pushkin site, run `yarn test` from the root of the site. **Importantly,** you must run `pushkin prep` before running tests in order for new experiments and/or changes to existing experiments to be picked up by the tests.

You can expand Jest testing for your Pushkin site as you see fit. If you develop more sophisticated testing for your site, we encourage you to consider how it could be contributed back to the project, so other users might benefit as well.

## Playwright (end-to-end) testing

Pushkin sites also come set up to run end-to-end tests using [Playwright](https://playwright.dev/). Unlike Jest tests, Playwright actually interacts with your local test deployment (i.e. it visits your site, does experiments, checks data, etc.). We utilize Playwright during development as well as an additional test on contributions.

Pushkin site templates contain a folder of end-to-end tests (`src/e2e/`) and a config file (`src/playwright.config.js`) that are copied into your Pushkin site when you run `pushkin install site`. This step also installs necessary dependencies. Likewise, experiment templates also contain an `e2e/` directory with tests specific to that experiment. Once the site is running (i.e. you've run `pushkin start`), you're ready to run end-to-end tests.

Note that while Jest test files are organized alongside source files, end-to-end tests are located in `e2e/` directories at the top level of the site and each experiment. Jest is configured to ignore test files in `e2e/` directories, so that the two testing systems remain separate.

End-to-end tests for experiment templates make use of jsPsych [simulation mode](https://www.jspsych.org/v7/overview/simulation) to run the experiment without any user input. You may also find it convenient to use simulation mode for manual testing when developing experiments. You can access an experiment in simulation mode by adding the URL parameter `simulate=true` to the experiment URL. For manual testing, you'll probably also want to add the additional URL parameter `mode=visual` to see the experiment as it runs. Note that only jsPsych plugins that have simulation mode will run as such, if you use a plugin that doesn't have simulation mode, the experiment will stop at that point and require user input.

### For pushkin repo development

It's important to note first that end-to-end tests are only relevant for running sites. You cannot run Playwright tests on source code in the development environment like you can with Jest tests. Nevertheless, we've tried to setup end-to-end testing so that contributors and users can utilize it in a similar way as with Jest tests.

Say you're working on a contribution and you want to run end-to-end tests using the basic site template. First, make sure to run the build script(s) for the relevant package(s)/template(s); then, from the root of the `pushkin` repo, run:

```
yarn test:e2e:setup basic
```

The `test:e2e:setup` script takes the name of the site template as its argument and sets up a test site in the `/testing` directory (which is Git-ignored). **Note that this script will clear out your local Docker with `docker system prune`.** When the script has finished running, you'll have a running Pushkin site containing experiments from all experiment templates in the repo and utilizing development versions of all Pushkin packages.

You can then run end-to-end tests with:

```
yarn test:e2e
```

This command simply goes into your test site and runs its `test:e2e` script, which in turn calls Playwright. If you run this immediately after the setup script, note that some tests may fail because components of the site haven't fully started yet (e.g. the front end has started but the the database hasn't).

Note that if you need to stop your site, you'll need to run `pushkin stop` inside the `/testing` directory. Likewise, you can manually add additional experiments to the test site, but you'll need to re-run the `prep` and `start` commands in the `/testing` directory before running end-to-end tests.

If you're developing new tests or your changes are causing tests to fail, you may find it helpful to run your tests in [UI](https://playwright.dev/docs/test-ui-mode) or [debug](https://playwright.dev/docs/debug) mode by adding the `--ui` or `--debug` flags (respectively) to the `yarn test:e2e` command.

End-to-end tests are run automatically via GitHub Actions as an additional layer of testing for contributions. The `/.github/workflows` directory contains a workflow file for each site template, e.g. `site-basic.yml`, which automatically runs end-to-end tests.

If you're contributing to a site or experiment template, we encourage you to add add both Jest and end-to-end tests (if possible) to cover your contribution. 

### For user site development

Pushkin templates ship to users with all the end-to-end tests corresponding to that particular site or experiment type. We try to make the tests for each template general and robust enough to be helpful to Pushkin users. Users can utilize, extend, or ignore the tests as they see fit.

To run end-to-end tests, first make sure your site is running (i.e. run `pushkin start`). Then, from the root of your site, run:

```
yarn test:e2e
```

If you're developing new tests or your changes are causing tests to fail, you may find it helpful to run your tests in [UI](https://playwright.dev/docs/test-ui-mode) or [debug](https://playwright.dev/docs/debug) mode by adding the `--ui` or `--debug` flags (respectively) to the `yarn test:e2e` command.

If you extend end-to-end testing for your Pushkin site, please consider how your tests might be made general enough to be contributed back to the relevant templates.
