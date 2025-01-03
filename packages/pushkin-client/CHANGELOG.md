# pushkin-client

## 1.8.0

### Minor Changes

- [#359](https://github.com/pushkin-consortium/pushkin/pull/359) [`44d9667`](https://github.com/pushkin-consortium/pushkin/commit/44d9667138989717ac13f9f5144e236386ccc3d3) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Pushkin helper packages have been updated to support new API endpoints for showing experiment feedback to participants. The client methods of interest which are used in the experiment's results page are:

  - `getPercentileRank(userID, experiment)` for fetching the percentile rank of a participant in an experiment
  - `getExpData(userID, experiment)` for fetching all of a participant's data for an experiment
  - `getModelPrediction(modelInput, modelPath)` for fetching a prediction from a Python model in the experiment's worker component

  See the description of the `results.js` file in the [overview of experiment templates](https://pushkin-consortium.github.io/pushkin/latest/exp-templates/exp-templates-overview/) for more details.

## 1.7.4

### Patch Changes

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`53bc2bf`](https://github.com/pushkin-consortium/pushkin/commit/53bc2bf40eadbfde8a657678c70bd4f57442bef2) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Add additional package info to package.json so npm pages display links to GitHub and docs

## 1.7.3

### Patch Changes

- [#304](https://github.com/pushkin-consortium/pushkin/pull/304) [`81f61e4`](https://github.com/pushkin-consortium/pushkin/commit/81f61e4c049a3dd7416c62e4c2b8876fcd1907f2) Thanks [@dependabot](https://github.com/apps/dependabot)! - bump axios to 1.6.8

## 1.7.2

### Patch Changes

- [#285](https://github.com/pushkin-consortium/pushkin/pull/285) [`2015e4a`](https://github.com/pushkin-consortium/pushkin/commit/2015e4a7aea89074c5a31b3f7280adea8c1db05e) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Fixed image tags in package READMEs so they display properly on npm
