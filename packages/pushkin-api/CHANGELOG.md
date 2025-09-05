# pushkin-api

## 1.7.0

### Minor Changes

- [#359](https://github.com/pushkin-consortium/pushkin/pull/359) [`44d9667`](https://github.com/pushkin-consortium/pushkin/commit/44d9667138989717ac13f9f5144e236386ccc3d3) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Pushkin helper packages have been updated to support new API endpoints for showing experiment feedback to participants. The client methods of interest which are used in the experiment's results page are:

  - `getPercentileRank(userID, experiment)` for fetching the percentile rank of a participant in an experiment
  - `getExpData(userID, experiment)` for fetching all of a participant's data for an experiment
  - `getModelPrediction(modelInput, modelPath)` for fetching a prediction from a Python model in the experiment's worker component

  See the description of the `results.js` file in the [overview of experiment templates](https://pushkin-consortium.github.io/pushkin/latest/exp-templates/exp-templates-overview/) for more details.

## 1.6.3

### Patch Changes

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`4504643`](https://github.com/pushkin-consortium/pushkin/commit/45046432432d45cc492c4aa35378f388f34cb5a0) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Bump supertest to ^7.0.0 and cookie-session to ^2.1.0

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`5a71392`](https://github.com/pushkin-consortium/pushkin/commit/5a71392a5adf03be41ae3c286db52aeac2264c8a) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - changed hard coded key into a randomly generated encrypted key

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`53bc2bf`](https://github.com/pushkin-consortium/pushkin/commit/53bc2bf40eadbfde8a657678c70bd4f57442bef2) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Add additional package info to package.json so npm pages display links to GitHub and docs

## 1.6.2

### Patch Changes

- [#311](https://github.com/pushkin-consortium/pushkin/pull/311) [`aca988c`](https://github.com/pushkin-consortium/pushkin/commit/aca988c9c4b9acab0b676798a0780848f70bdbf6) Thanks [@dependabot](https://github.com/apps/dependabot)! - Bump express from 4.18.2 to 4.19.2

## 1.6.1

### Patch Changes

- [#285](https://github.com/pushkin-consortium/pushkin/pull/285) [`2015e4a`](https://github.com/pushkin-consortium/pushkin/commit/2015e4a7aea89074c5a31b3f7280adea8c1db05e) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Fixed image tags in package READMEs so they display properly on npm
