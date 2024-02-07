# Self-paced reading template

To install this experiment template, use the command `pushkin install experiment`, then select **reading**.

## config.js

**comprehension**: If `true`, each self-paced reading trial will be followed by a two-alternative forced-choice comprehension question. If `false`, the experiment goes right to the next self-paced reading trial.

**correctiveFeedback**: If `true`, participants will get feedback after answering each comprehension question which indicates whether their response was correct or incorrect. If `false`, no feedback will follow the comprehension questions. This parameter has no effect if comprehension questions are not being displayed.

## stim.js

**sentence**: The sentence or text to be read. See above for details on how to note what chunks of words should be displayed together for a self-paced reading display rate.

**comprehension**: An array containing the specifications for the comprehension questions. The first element is the question itself, the second is the correct answer, and the third is the incorrect answer. The correct and incorrect answers are randomly assigned to the 'F' and 'J' keys in experiment.js.

## Example: Customizing a self-paced reading experiment

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

In order to customize your self-paced reading experiment, you will need to access two files, `config.js` and `stim.js`. These files can be found in `web page/src/`, a directory that looks like this:

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

#### Modifying `config.js`

This file controls the aesthetics of your experiment, including font color, font size, and font family. If you wanted to set the font color to `blue`, set the font size to `36px`, and set the font family to a serif font such as Palatino Linotype, you would modify `config.js` as follows:

```javascript
const experimentConfig = {
  fontColor: "blue",
  fontSize: "36px",
  fontFamily: "'Palatino Linotype', Palatino, serif",
  comprehension: true,
  correctiveFeedback: true, // Only relevant if comprehension is set to true
};

export default experimentConfig;
```

You'll notice that `'Palatino Linotype'` is not `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp).

Note that any font-related changes you make to `config.js` will not affect the font in the actual self-paced reading trials. To modify that font (and other plugin parameters), you will need to edit the trial in `experiment.js`. See the [plugin documentation](https://github.com/jspsych/jspsych-contrib/blob/main/packages/plugin-self-paced-reading/docs/jspsych-self-paced-reading.md) for details.

You can run `pushkin prep` and `pushkin start` to see your changes.

#### Modifying `stim.js`

This file controls the self-paced reading sentences and comprehension questions (if relevant) presented to participants. Create a new table of sentences and comprehension questions for your experiment, with your comprehension questions in a three-element array (i.e. ['question' , 'correct answer', 'incorrect answer']). Then use a table-to-JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych and paste the array into the `stim.js` file. Run `pushkin prep` and `pushkin start` again, and your experiment should be ready to go!
