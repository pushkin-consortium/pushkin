---
"@pushkin-templates/exp-grammaticality-judgment": minor
"@pushkin-templates/exp-self-paced-reading": minor
"@pushkin-templates/exp-lexical-decision": minor
"@pushkin-templates/exp-basic": minor
"@pushkin-templates/site-basic": minor
---

All Pushkin templates have been updated to support post-experiment feedback to participants. There are now two options users can specify for the `resultsType` parameter the in the experiment's `config.yaml`: `'percentileRank'` and `'modelPrediction'`. Percentile rank feedback displays the participant's percentile rank in the experiment based on the summary statistic specified in the `experiment.js` file. Model prediction feedback is currently a stub, but can be easily extended to utilize any Python model to make predictions based on the participant's data. See the [overview of experiment templates](https://pushkin-consortium.github.io/pushkin/latest/exp-templates/exp-templates-overview/) in the documentation for more details.
