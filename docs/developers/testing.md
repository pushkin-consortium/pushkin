# Testing

## Jest

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

## Playwright

Pushkin sites also come set up to run end-to-end tests using [Playwright](https://playwright.dev/). Unlike Jest tests, Playwright actually interacts with your local test deployment (i.e. it visits your site, does experiments, checks data, etc.). We utilize Playwright during development as well as an additional test on contributions.

Note that end-to-end tests are only relevant for running sites. You cannot run Playwright tests on source code in the development environment like you can with Jest tests. While we do use end-to-end tests in the development process, they have to be run on a test site.

### For end-to-end testing

Pushkin site templates contain a folder of end-to-end tests (`src/e2e/`) and a config file (`src/playwright.config.js`) that are copied into your Pushkin site when you run `pushkin install site`. This step also installs necessary dependencies. Because end-to-end tests actually interact with the local test site, you must have the site running when you run end-to-end tests (i.e. you must have already run `pushkin start`). Run the tests with the command:

```
yarn test:e2e
```

If you're developing your own tests, you may find it helpful to run your tests in [UI](https://playwright.dev/docs/test-ui-mode) or [debug](https://playwright.dev/docs/debug) mode by adding the `--ui` or `--debug` flags (respectively) to the command above.

Note that while Jest test files are organized alongside source files, end-to-end tests are all located in the `e2e/` directory. Jest is configured to ignore test files in `e2e/`, so that the two testing systems remain separate.

Each site template's tests are run automatically via GitHub Actions as an additional layer of testing for contributions. The `.github/workflows/` directory contains a workflow file for each site template, e.g. `site-basic.yml`, which runs its end-to-end tests.

If you're contributing to a site template, we encourage you to add add both Jest and end-to-end tests (if possible) to cover your contribution. If you extend end-to-end testing for your own Pushkin site, please consider how your tests might be made general enough to be contributed back to one or more site templates.
