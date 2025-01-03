---
"pushkin-client": minor
"pushkin-worker": minor
"pushkin-api": minor
---

Pushkin helper packages have been updated to support new API endpoints for showing experiment feedback to participants. The client methods of interest which are used in the experiment's results page are:

 - `getPercentileRank(userID, experiment)` for fetching the percentile rank of a participant in an experiment
 - `getExpData(userID, experiment)` for fetching all of a participant's data for an experiment
 - `getModelPrediction(modelInput, modelPath)` for fetching a prediction from a Python model in the experiment's worker component

 See the description of the `results.js` file in the [overview of experiment templates](https://pushkin-consortium.github.io/pushkin/latest/exp-templates/exp-templates-overview/) for more details.
