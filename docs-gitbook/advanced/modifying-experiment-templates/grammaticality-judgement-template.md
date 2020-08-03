# Grammaticality judgement template

To install this experiment template, use the command `pushkin install experiment`, then select **grammaticality**.

* [config info](grammaticality-judgement-template.md#config-js)
* [stim info](grammaticality-judgement-template.md#stim-js)

![Grammaticality judgement experiment template, with corrective response set to true.](../../.gitbook/assets/ezgif.com-video-to-gif-8-.gif)

### config.js

When **correctiveFeedback** is set to true: the two-alternative forced choice question will indicate if participant's response was correct \(in green font\) or not \(in red font\). For the likert scale or slider, text indicating if the sentence was grammatical or ungrammatical will show. For all response types, when this is set to false, a fixation cross appears instead of corrective feedback.

**responseType**: Set whether the response type is 2-alternative forced choice \(set to "2afc"\), 5 item likert scale \(set to "likert"\), or a slider from 0-100 \(set to "slider"\).

### stim.js

**sentence\_grammatical**: The grammatically correct sentence.

**sentence\_ungrammatical**: The grammatically incorrect sentence.

