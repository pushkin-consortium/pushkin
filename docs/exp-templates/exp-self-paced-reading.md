# @pushkin-templates/exp-self-paced-reading

The self-paced-reading template includes an experiment in which participants read sentences presented in word-by-word fashion.

## Installing the exp-self-paced-reading template

In your Pushkin site directory, run:

```
pushkin i exp
```

Name the experiment and select the main Pushkin distribution. Select `@pushkin-templates/exp-self-paced-reading` from the list of available templates and choose which version you want (the latest is typically recommended).

## Configuration options

In the experiment's `/web page/src` direrectory, you'll find the config file `options.js`. Here you'll find some options which change the behavior of the experiment:

- **`fontColor`:** the color for experiment text (see note below for details)
- **`fontSize`:** the size for experiment text (see note below for details)
- **`fontFamily`:** the font for experiment text (note that multiple backups are specified, in case specific fonts are not available for particular participants; see note below for details)
- **`comprehension`:** when `true`, each self-paced reading trial will be followed by a two-alternative forced-choice comprehension question; when `false`, the experiment goes right to the next self-paced reading trial
- **`correctiveFeedback`:** if `true`, participants will get feedback after answering each comprehension question which indicates whether their response was correct or incorrect; if `false`, no feedback will follow the comprehension questions; note that this parameter has no effect if comprehension questions are not being displayed

!!! note
    The `fontColor`, `fontSize`, and `fontFamily` config options do not apply to the actual self-paced-reading stimuli (i.e. the text rendered by the jsPsych self-paced-reading plugin). To alter the aesthetics of these sentences, modify the plugin's parameters in `experiment.js` (see the plugin's [documentation](https://github.com/jspsych/jspsych-contrib/blob/main/packages/plugin-self-paced-reading/docs/jspsych-self-paced-reading.md) for details)

## Stimuli

{{ read_json('docs/assets/exp-templates/exp-self-paced-reading/stim.json') }}

The stimuli for this experiment have two parameters:

- **`sentence`:** the sentence or text to be read
- **`comprehension`:** an array containing the specifications for the comprehension questions; the first element is the question itself, the second is the correct answer, and the third is the incorrect answer. The correct and incorrect answers are randomly assigned to the 'F' and 'J' keys in `experiment.js`.

## Customizing a self-paced-reading experiment

### Finding experiment files to modify

If you have installed an experiment using the self-paced reading experiment template and called it `spr`, you should have a directory called `spr` in your experiments folder. This directory should be structured like this:

```example
spr
├── api controllers
├── config.yaml
├── LICENSE
├── migrations
├── README.md
├── web page
└── worker
```

In order to customize your self-paced reading experiment, you will need to access two files, `options.js` and `stim.js`. These files can be found in `web page/src/`, a directory that looks like this:

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

This file controls the aesthetics of your experiment, including font color, font size, and font family. If you wanted to set the font color to `blue`, set the font size to `36px`, and set the font family to a serif font such as Palatino Linotype, you would modify `options.js` as follows:

```javascript
const expOptions = {
  fontColor: "blue",
  fontSize: "36px",
  fontFamily: "'Palatino Linotype', Palatino, serif",
  comprehension: true,
  correctiveFeedback: true, // Only relevant if comprehension is set to true
};

export default expOptions;
```

You'll notice that `'Palatino Linotype'` is not `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp).

Note that any font-related changes you make to `options.js` will not affect the font in the actual self-paced reading trials. To modify that font (and other plugin parameters), you will need to edit the trial in `experiment.js`. See the [plugin documentation](https://github.com/jspsych/jspsych-contrib/blob/main/packages/plugin-self-paced-reading/docs/jspsych-self-paced-reading.md) for details.

You can run `pushkin prep` and `pushkin start` to see your changes.

### Modifying `stim.js`

This file controls the self-paced reading sentences and comprehension questions (if relevant) presented to participants. Create a new table of sentences and comprehension questions for your experiment, with your comprehension questions in a three-element array (i.e. `['<question>', '<correct answer>', '<incorrect answer>']`). Then use a table-to-JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych and paste the array into the `stim.js` file.

Run `pushkin prep` and `pushkin start` again, and your experiment should be ready to go!
