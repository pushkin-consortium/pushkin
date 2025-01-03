# @pushkin-templates/exp-grammaticality-judgment

The grammaticality-judgment template includes an experiment in which participants rate the acceptability of target sentences.

## Installing the exp-grammaticality-judgment template

In your Pushkin site directory, run:

```
pushkin i exp
```

Name the experiment and select the main Pushkin distribution. Select `@pushkin-templates/exp-grammaticality-judgment` from the list of available templates and choose which version you want (the latest is typically recommended).

## Configuration options

In the experiment's `/web page/src` direrectory, you'll find the config file `options.js`. Here you'll find some options which change the behavior of the experiment:

- **`fontColor`:** the color for experiment text
- **`fontSize`:** the size for experiment text
- **`fontFamily`:** the font for experiment text (note that multiple backups are specified, in case specific fonts are not available for particular participants)
- **`correctiveFeedback`:** when set to `true`, two-alternative forced choice questions will indicate if the participant's response was correct (in green font) or not (in red font). For the likert scale or slider, text indicating if the sentence was grammatical or ungrammatical will show. For all response types, when this is set to `false`, a fixation cross appears instead of corrective feedback
- **`responseType`:** controls whether the response type is two-alternative forced choice ("2afc"), five-point likert scale ("likert"), or a slider from 0-100 ("slider")

## Stimuli

{{ read_json('docs/assets/exp-templates/exp-grammaticality-judgment/stim.json') }}

The stimuli for this experiment have two parameters:

- **`sentence_grammatical`:** the grammatically correct version of the sentence
- **`sentence_ungrammatical`:** the grammatically incorrect version of the sentence

## Customizing a grammaticality-judgment experiment

### Finding experiment files to modify

If you have installed an experiment using the grammaticality judgment experiment template and called it `gram`, you should have a directory called `gram` in your experiments folder. This directory should be structured like this:

```example
gram
├── api controllers
├── config.yaml
├── LICENSE
├── migrations
├── README.md
├── web page
└── worker
```

In order to customize your simple grammaticality judgment experiment, you will need to access two files, `options.js` and `stim.js`. These files can be found in `web page/src/`, a directory that looks like this:

```example
src
├── assets
├── consent.js
├── debrief.js
├── experiment.js
├── experiment.test.js
├── index.js
├── options.js
├── results.js
└── stim.js
```

### Modifying `options.js`

This file controls the aesthetics of your experiment, including font color, font size, and font family. If you wanted to set the font color to `green`, set the font size to `24px`, and set the font family to a monospace font such as Courier New, you would modify `options.js` as follows:

```javascript
const expOptions = {
  fontColor: "green",
  fontSize: "24px",
  fontFamily: "'Courier New', 'Arial', sans-serif",
  correctiveFeedback: true,
  // Options for responseType are:
  // - "2afc" for a 2-alternative forced choice
  // - "likert" for a likert scale
  // - "slider" for a 0-100 sliding scale
  responseType: "2afc",
};

export default expOptions;
```

You'll notice that `'Courier New'` is not `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp).

You'll also notice that `correctiveFeedback` is set to `true`. You can change this to `false` so that participants don't receive any feedback. Once you make this change, your `options.js` should look like this:

```javascript
const expOptions = {
  fontColor: "green",
  fontSize: "24px",
  fontFamily: "'Courier New', Courier, monospace",
  correctiveFeedback: false,
  // Options for responseType are:
  // - "2afc" for a 2-alternative forced choice
  // - "likert" for a likert scale
  // - "slider" for a 0-100 sliding scale
  responseType: "2afc",
};

export default expOptions;
```

You can then run `pushkin prep` and `pushkin start` to see your changes.

### Modifying `stim.js`

This file controls the stimuli presented to participants. It specifies the sentences for each trial and denotes which is grammatical (sentence_grammatical) and which is not (sentence_ungrammatical).

Say you have created the following table of stimuli for your experiment:

{{ read_json('docs/assets/exp-templates/exp-grammaticality-judgment/alt-stim.json') }}

In order to be able to use these stimuli in the grammaticality judgment experiment, you must use a table-to-JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych. Once it has been converted, paste the JSON into the `stim.js` file so that the new object of stimuli is assigned to the `stimArray` variable.

Run `pushkin prep` and `pushkin start` again, and your experiment should be ready to go!
