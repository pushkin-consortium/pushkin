# Testing with Jest

The pushkin repo is set up to run tests using [Jest](https://jestjs.io/), a popular JavaScript testing library. In addition to testing contributions to the Pushkin codebase, Jest is also configured for Pushkin users to run tests on their own Pushkin sites.

## Jest for pushkin repo development

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

## Jest for user site development

Pushkin sites come pre-configured to run Jest tests. Tests enter your site from two sources:

1. **Site templates**: Currently, the [basic site template](../site-templates/site-basic.md) has multiple tests focusing on rendering site components and integration tests for your experiments.
2. **Experiment templates**: Tests in the experiment templates focus primarily on checking that the jsPsych timeline runs and outputs the expected data.

To run tests on your local Pushkin site, run `yarn test` from the root of the site. **Importantly,** you must run `pushkin prep` before running tests in order for new experiments and/or changes to existing experiments to be picked up by the tests.

You can expand testing for your Pushkin site as you see fit. If you develop more sophisticated testing for your site, we encourage you to consider how it could be contributed back to the project, so other users might benefit as well.