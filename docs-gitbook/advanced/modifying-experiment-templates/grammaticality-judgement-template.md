# Grammaticality judgement template

To install this experiment template, use the command `pushkin install experiment`, then select **grammaticality**.

### config.js

When **correctiveFeedback** is set to true: the two-alternative forced choice question will indicate if participant's response was correct \(in green font\) or not \(in red font\). For the likert scale or slider, text indicating if the sentence was grammatical or ungrammatical will show. For all response types, when this is set to false, a fixation cross appears instead of corrective feedback.

**responseType**: Set whether the response type is 2-alternative forced choice \(set to "2afc"\), 5 item likert scale \(set to "likert"\), or a slider from 0-100 \(set to "slider"\).

