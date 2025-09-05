# @pushkin-templates/exp-lexical-decision

The lexical-decision template includes an experiment in which participants must choose as quickly as possible whether two strings are true words of English.

## Installing the exp-lexical-decision template

In your Pushkin site directory, run:

```
pushkin i exp
```

Name the experiment and select the main Pushkin distribution. Select `@pushkin-templates/exp-lexical-decision` from the list of available templates and choose which version you want (the latest is typically recommended).

## Configuration options

In the experiment's `/web page/src` direrectory, you'll find the config file `options.js`. Here you'll find some options which change the behavior of the experiment:

- **`fontColor`:** the color for experiment text
- **`fontSize`:** the size for experiment text
- **`fontFamily`:** the font for experiment text (note that multiple backups are specified, in case specific fonts are not available for particular participants)
- **`correctiveFeedback`:** when to `true`, the bounding box will change color based on the participant's response (green for correct, red for incorrect); when set to `false`, the box remains black

## Stimuli

{{ read_json('docs/assets/exp-templates/exp-lexical-decision/stim.json') }}

The stimuli for this experiment have four parameters:

- **word_1:** the word displayed in the top of the fixation box
- **word_2:** the word displayed in the bottom of the fixation box
- **both_words:** if `true`, "Y" is the correct answer (both `word_1` and `word_2` are real words); if false, "N" is the correct answer (at least one of `word_1` and `word_2` is not a real word)
- **related:** if `true`, the words are semantically related to each other (e.g. "leaf" and "tree"). If `false`, the words are unrelated (e.g. sock and tree)

## Customizing a lexical-decision experiment

### Finding experiment files to modify

If you have installed an experiment using the lexical decision experiment template and called it `lex`, you should have a directory called `lex` in your experiments folder. This directory should be structured like this:

```example
lex
├── api controllers
├── config.yaml
├── LICENSE
├── migrations
├── README.md
├── web page
└── worker
```

In order to customize your simple lexical decision experiment, you will need to access two files, `options.js` and `stim.js`. These files can be found in `web page/src/`, a directory that looks like this:

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

This file controls the aesthetics of your experiment, including font color, font size, and font family. If you wanted to set the font color to `red`, set the font size to `22px`, and set the font family to a monospace font such as Courier New, you would modify `options.js` as follows:

```javascript
const expOptions = {
  fontColor: "red",
  fontSize: "22px",
  fontFamily: "'Courier New', Courier, monospace",
  correctiveFeedback: true,
};

export default expOptions;
```

You'll notice that `'Courier New'` is not `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp). You'll also notice that `correctiveFeedback` is set to `true`. You can change this to `false` so that participants don't receive any feedback.

After making any desired changes, run `pushkin prep` and `pushkin start` to see the updates.

### Modifying `stim.js`

This file controls the stimuli presented to participants. It specifies (1) the two words presented on the screen (`word_1` and `word_2`), (2) whether both words are true words (`both_words`), and (3) whether the two words are related to each other (`related`).

Say you have created the following table of stimuli for your experiment:

{{ read_json('docs/assets/exp-templates/exp-lexical-decision/alt-stim.json') }}

In order to use these stimuli in the lexical-decision experiment, you must use a table-to-JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych. Once it has been converted, paste the JSON into the `stim.js` file so that the new object of stimuli is assigned to the `stimArray` variable.

Run `pushkin prep` and `pushkin start` again, and your experiment should be ready to go!
