# Testing with Jest

The pushkin repo is set up to run tests using [Jest](https://jestjs.io/), a popular JavaScript testing library. In addition to testing contributions to the Pushkin codebase, Jest is also configured for Pushkin users to run tests on their own Pushkin sites.

## Jest for pushkin repo development

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

Pushkin sites come pre-configured to run Jest tests. Currently, the only tests distributed to Pushkin users enter your site through two areas:

1. **Experiment Templates**: Tests in the experiment templates primarily focus on validating the jsPsych timeline that is essential to experiment functionality
2. **Site Templates**: Currently, [site-basic](../site-templates/site-basic.md) has multiple tests focusing on rendering site components and integration testing of experiments.

!!! warning "Dependency Installation Issue in /pushkin/front-end"
    If you install any dependencies in `/pushkin/front-end` during development, the tests will fail, resulting in the "invalid hook call" error.  To resolve this problem, delete the `node_modules` directory and reinstall the dependencies.

To run tests on your local site begin by running `yarn install` followed by `yarn test`. Note that the `install` command only needs to be run once. 

```
yarn install
```

```
yarn test
```

You can expand testing for your Pushkin site as you see fit. If you develop more sophisticated testing for your site, we encourage you to consider how it could be contributed back to the project, so other users might benefit as well.