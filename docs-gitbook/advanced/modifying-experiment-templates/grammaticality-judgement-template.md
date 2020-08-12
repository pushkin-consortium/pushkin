# Grammaticality judgement template

To install this experiment template, use the command `pushkin install experiment`, then select **grammaticality**.

* [config info](grammaticality-judgement-template.md#config-js)
* [stim info](grammaticality-judgement-template.md#stim-js)
* [Example: Customizing a lexical decision experiment](grammaticality-judgement-template.md#example-customizing-a-lexical-decision-experiment)

![Grammaticality judgement experiment template, with corrective response set to true.](../../.gitbook/assets/ezgif.com-video-to-gif-8-.gif)

### config.js

When **correctiveFeedback** is set to true: the two-alternative forced choice question will indicate if participant's response was correct \(in green font\) or not \(in red font\). For the likert scale or slider, text indicating if the sentence was grammatical or ungrammatical will show. For all response types, when this is set to false, a fixation cross appears instead of corrective feedback.

**responseType**: Set whether the response type is 2-alternative forced choice \(set to "2afc"\), 5 item likert scale \(set to "likert"\), or a slider from 0-100 \(set to "slider"\).

### stim.js

**sentence\_grammatical**: The grammatically correct sentence.

**sentence\_ungrammatical**: The grammatically incorrect sentence.

## Example: Customizing a lexical decision experiment

### Finding experiment files to modify

If you have installed an experiment using the grammaticality judgement experiment template and called it `gram`, you should have a directory called `gram` in your experiments folder. This directory should be structured like this:

```example
gram
├── api controllers
├── config.yaml
├── LICENSE
├── migrations
├── package-lock.json
├── README.md
├── web page
└── worker
```
In order to customize your simple grammaticality judgement experiment, you will need to access two files, `config.js` and `stim.js`. These files can be found in `web page/src/`, a directory that looks like this:

```example
src
├── assets
├── config.js
├── consent.js
├── debrief.js
├── experiment.js
├── index.js
└── stim.js
```

### Modifying the experiment configuration and stimuli files

#### Modifying `config.js`

This file controls the aesthetics of your experiment, including font color, font size, and font family. If you wanted to set the font color to `green`, set the font size to `24px`, and set the font family to a monospace font such as Courier New, you would modify `config.js` as follows:

```javascript
// Custom stylin'

var experimentConfig = {
    fontColor: "green",
    fontSize: "24px",
    fontFamily: "'Courier New', Courier, monospace",
    correctiveFeedback: "true"
    responseType: “2afc”
}

export default experimentConfig;
```

You'll notice that `'Courier New'` is not the only `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp). 

You'll also notice that `correctiveFeedback` is set to `true`. You can change this to `false` so that participants don't receive any feedback. Once you make this change, your `config.js` should look like this:

```javascript
// Custom stylin'

var experimentConfig = {
    fontColor: "green",
    fontSize: "24px",
    fontFamily: "'Courier New', Courier, monospace",
    correctiveFeedback: "false"
    responseType: “2afc”
}

export default experimentConfig;
```

By default, `responseType` is set to `2afc`. You can change this to `likert` or `slider` to change the response type to a 5-item likert scale or a slider from 0-100. If you wanted to use a likert scale, your final `config.js` should look like this:

```javascript
// Custom stylin'

var experimentConfig = {
    fontColor: "green",
    fontSize: "24px",
    fontFamily: "'Courier New', Courier, monospace",
    correctiveFeedback: "false"
    responseType: “likert”
}

export default experimentConfig;
```

You can run `pushkin prep` and `pushkin start;` to see your changes. 


#### Modifying `stim.js`

This file controls the stimuli presented to participants. It specifies the sentences for each trial and denotes which is grammatical (sentence_grammatical) and which is not (sentence_ungrammatical). 

Say you have created the following table of stimuli for your experiment.

| sentence\_grammatical | sentence\_ungrammatical |
|-----------------------|-------------------------|
| The frog is jumping\. | The frog are jumping\.  |
| Where did she go?     | Where she did go?       |
| He went for a walk\.  | He went a walk\.        |
| This is an example\.  | This an example\.       |


In order to be able to use these stimuli in the grammaticality judgement experiment, you must use a table to JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych. 

Once it has been converted, paste the JSON into the `stim.js` file. You may need to manually add spaces, as the file should now look like this:

```javascript
// Example stimuli

const stimArray = [
    {sentence_grammatical: 'The frog is jumping.', sentence_ungrammatical: 'The frog are jumping.'},
    {sentence_grammatical: 'Where did she go?', sentence_ungrammatical: 'Where she did go?'},
    {sentence_grammatical: 'He went for a walk.', sentence_ungrammatical: 'He went a walk.'},
    {sentence_grammatical: 'This is an example.', sentence_ungrammatical: 'This an example.'}
]


export default stimArray;
```

Run `pushkin prep` and `pushkin start;` again, and your experiment should be ready to go!

