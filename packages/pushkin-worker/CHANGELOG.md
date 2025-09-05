# pushkin-worker

## 3.1.0

### Minor Changes

- [#359](https://github.com/pushkin-consortium/pushkin/pull/359) [`44d9667`](https://github.com/pushkin-consortium/pushkin/commit/44d9667138989717ac13f9f5144e236386ccc3d3) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Pushkin helper packages have been updated to support new API endpoints for showing experiment feedback to participants. The client methods of interest which are used in the experiment's results page are:

  - `getPercentileRank(userID, experiment)` for fetching the percentile rank of a participant in an experiment
  - `getExpData(userID, experiment)` for fetching all of a participant's data for an experiment
  - `getModelPrediction(modelInput, modelPath)` for fetching a prediction from a Python model in the experiment's worker component

  See the description of the `results.js` file in the [overview of experiment templates](https://pushkin-consortium.github.io/pushkin/latest/exp-templates/exp-templates-overview/) for more details.

## 3.0.3

### Patch Changes

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`5a71392`](https://github.com/pushkin-consortium/pushkin/commit/5a71392a5adf03be41ae3c286db52aeac2264c8a) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Removed console.logging of potentially sensitive information like passwords

- [#347](https://github.com/pushkin-consortium/pushkin/pull/347) [`53bc2bf`](https://github.com/pushkin-consortium/pushkin/commit/53bc2bf40eadbfde8a657678c70bd4f57442bef2) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Add additional package info to package.json so npm pages display links to GitHub and docs

## 3.0.2

### Patch Changes

- [#343](https://github.com/pushkin-consortium/pushkin/pull/343) [`79f8350`](https://github.com/pushkin-consortium/pushkin/commit/79f8350cb217445d974521fed2a6a59c88e94c41) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Bump amqplib from ^0.6.0 to ^0.10.3
  Remove @babel/polyfill; bump core-js from ^3.4.5 to ^3.23.3 (should resolve warnings [noted](https://github.com/pushkin-consortium/pushkin/pull/338#issue-2228388809) in #338)

## 3.0.1

### Patch Changes

- [#285](https://github.com/pushkin-consortium/pushkin/pull/285) [`2015e4a`](https://github.com/pushkin-consortium/pushkin/commit/2015e4a7aea89074c5a31b3f7280adea8c1db05e) Thanks [@jessestorbeck](https://github.com/jessestorbeck)! - Fixed image tags in package READMEs so they display properly on npm
