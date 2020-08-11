# Lexical decision template

To install this experiment template, use the command `pushkin install experiment`, then select **lexical**.

* [config info](lexical-decision-template.md#config-js)
* [stim info](lexical-decision-template.md#stim-js)
* [Example: Customizing a lexical decision experiment](lexical-decision-template.md#example-customizing-a-lexical-decision-example)

![Lexical decision experiment template, with corrective response set to true.](../../.gitbook/assets/ezgif.com-video-to-gif-9-.gif)

## config.js

When **correctiveFeedback** is set to true, the bounding box will change color to indicate correctness - green meaning correct, and red meaning incorrect. If set to false, the box remains black.

## stim.js

**word\_1**: Word displayed on top in fixation box

**word\_2**: Word displayed on bottom in fixation box

**both\_words**: If true, 'Y' is the correct answer \(both word\_1 and word\_2 are real words\). If false, one or both of the words is not a real world and the correct answer is 'N'

**related**: If true, the words are related to each other \(e.g. leaf and tree\). If false, the words are unrelated \(e.g. sock and tree\).

## Example: Customizing a lexical decision experiment

## Finding experiment files to modify

If you have installed an experiment using the lexical decision experiment template and called it `lex`, you should have a directory called `lex` in your experiments folder. This directory should be structured like this:

```example
lex
├── api controllers
├── config.yaml
├── LICENSE
├── migrations
├── package-lock.json
├── README.md
├── web page
└── worker
```
In order to customize your simple lexical decision experiment, you will need to access two files, `config.js` and `stim.js`. These files can be found in `web page/src/`, a directory that looks like this:

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

## Modifying the experiment configuration and stimuli files

### Modifying `config.js`

This file controls the aesthetics of your experiment, including font color, font size, and font family. If I wanted to set the font color to `red`, set the font size to `20px` and set the font family to a monospace, sans-serif font such as Courier New, I would modify `config.js` as follows:

```javascript
// Custom stylin'

var experimentConfig = {
    fontColor: "red",
    fontSize: "20px",
    fontFamily: "'Courier New', Courier, monospace",
    correctiveFeedback: "true"
}

export default experimentConfig;
```

You'll notice that `'Courier New'` is not the only `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp). 

You'll also notice that `correctiveFeedback` is set to `true`. Let's change this to `false` so that participants receive any feedback. Once you make this change, your final `config.js` should look like this:

```javascript
// Custom stylin'

var experimentConfig = {
    fontColor: "red",
    fontSize: "20px",
    fontFamily: "'Courier New', Courier, monospace",
    correctiveFeedback: "false"
}

export default experimentConfig;
```

You can run `pushkin prep` and `pushkin start;` to see your changes. 


### Modifying `stim.js`

This file controls the stimuli presented to participants. It specifices not only (1) what two words should be presented on the screen (`word_1` and `word_2`), but also (2) whether both words are true words (`both_words`), and (3) whether the two words are related to each other (`related`). 

Say you have created the following table of stimuli for your experiment.

| word_1 | word_2 | both_words | related |
|--------|--------|------------|---------|
| FLOWER | PETAL  | true       | true    |
| BALL   | NET    | true       | true    |
| DOG    | LEASH  | true       | true    |
| COMB   | BRUSH  | true       | true    |
| BABY   | BEAN   | true       | false   |
| CAGE   | FERN   | true       | false   |
| DOG    | FLOUR  | true       | false   |
| GOAT   | SAND   | true       | false   |
| VASE   | VATE   | false      | false   |
| ARM    | ARL    | false      | false   |
| COAT   | COET   | false      | false   |
| HAIR   | HAIP   | false      | false   |
| HAME   | HAMA   | false      | false   |
| DAKE   | GRAKE  | false      | false   |
| CLEB   | CLED   | false      | false   |
| AFTY   | AFLY   | false      | false   |

In order to be able to use these stimuli in the lexical decision experiment, you must use a table to JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych. 

Once it has been converted, paste the JSON into the `stim.js` file, which should now look like this:

```javascript
// Example stimuli

const stimArray = [

    {word_1: 'FLOWER', word_2: 'PETAL', both_words: true, related: true},
    {word_1: 'BALL', word_2: 'NET', both_words: true, related: true},
    {word_1: 'DOG', word_2: 'LEASH', both_words: true, related: true},
    {word_1: 'COMB', word_2: 'BRUSH', both_words: true, related: true},
    {word_1: 'BABY', word_2: 'BEAN', both_words: true, related: false},
    {word_1: 'CAGE', word_2: 'FERN', both_words: true, related: false},
    {word_1: 'DOG', word_2: 'FLOUR', both_words: true, related: false},
    {word_1: 'GOAT', word_2: 'SAND', both_words: true, related: false},
    {word_1: 'VASE', word_2: 'VATE', both_words: false, related: false},
    {word_1: 'ARM', word_2: 'ARL', both_words: false, related: false},
    {word_1: 'COAT', word_2: 'COET', both_words: false, related: false},
    {word_1: 'HAIR', word_2: 'HAIP', both_words: false, related: false},
    {word_1: 'HAME', word_2: 'HAMA', both_words: false, related: false},
    {word_1: 'DAKE', word_2: 'GRAKE', both_words: false, related: false},
    {word_1: 'CLEB', word_2: 'CLED', both_words: false, related: false},
    {word_1: 'AFTY', word_2: 'AFLY', both_words: false, related: false}
]

export default stimArray;
```

Run `pushkin prep` and `pushkin start;` again, and your experiment should be ready to go!
