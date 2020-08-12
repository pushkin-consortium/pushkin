# Self-paced reading template

To install this experiment template, use the command `pushkin install experiment`, then select **reading**.

* [config info](self-paced-reading-template.md#config-js)
* [stim info](self-paced-reading-template.md#stim-js)
* [Example: Customizing a self-paced reading experiment](lexical-decision-template.md#example-customizing-a-lexical-decision-experiment)

![Self-paced reading experiment template, with the setting &quot;moving word&quot; \(see below for details\)](../../.gitbook/assets/ezgif.com-video-to-gif-7-.gif)

## config.js

**displayType**: Setting for how target words or text are isolated. Option of either:

1. "moving": display full target text on the page, with dashes replacing words/text to mimic reading rate
2. "separate": display each word/chunk of text independently on separate pages.

**displayRate**: Setting for structure of the text and units of target text to be displayed together. Option of:

* "word" for displaying word-by-word \(one word at a time, with remaining words replaced with dashes\).
* "chunk" for setting your own break points using + signs in your sentence stimuli to indicate chunks of text to be displayed together \(i.e. 1 or more words at once\), one at a time. _Be sure to have the + sign before and after each chunk: for example, "+This is+ the target+ sentence.+"_
* "sentence word" for showing sentence by sentence. The last sentence in the stimulus automatically becomes the target sentence, with the words displayed one at a time.
* "sentence chunk" for showing sentence by sentence. The last sentence in the stimulus automatically becomes the target sentence, with the chunks displayed one at a time - chunks must be separated by + signs.
* "sentence" without word or chunk, it will default to word.

## stim.js

**sentence:** The sentence or text to be read. See above for details on how to note what chunks of words should be displayed together for self-paced reading display rate.

## Example: Customizing a self-paced reading experiment

### Finding experiment files to modify

If you have installed an experiment using the self-paced reading experiment template and called it `spr`, you should have a directory called `spr` in your experiments folder. This directory should be structured like this:

```example
spr
├── api controllers
├── config.yaml
├── LICENSE
├── migrations
├── package-lock.json
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

This file controls the aesthetics of your experiment, including font color, font size, and font family. If you wanted to set the font color to `blue`, set the font size to `36px` and set the font family to a serif font such as Palatino Linotype, you would modify `config.js` as follows:

```javascript
const experimentConfig = {
    fontColor: "blue",
    fontSize: "36px",
    fontFamily: "'Palatino Linotype', Palatino, serif",
    displayType: "moving",
    displayRate: "word",
}

export default experimentConfig;
```


You'll notice that `'Palatino Linotype'` is not the only `fontFamily`'s only specification. This is because it's important to list backup fonts in case your preferred font can't be loaded. You can read more about this practice [here](https://discuss.codecademy.com/t/how-many-fallback-fonts-should-i-have/363586) and see other CSS font combination ideas [here](https://www.w3schools.com/cssref/css_websafe_fonts.asp). 


You'll also notice that there are two other parameters, `displayType` and `displayRate`. You can change the default, a `moving` window display type, to a `separate` display type where each chunk of text is shown independently. You can also change the display rate to `chunk` so that you can specify how many words show up at a time in our `stimuli.js` file.

Once you make these changes, your final `config.js` should look like this:

```javascript
const experimentConfig = {
    fontColor: "blue",
    fontSize: "36px",
    fontFamily: "'Palatino Linotype', Palatino, serif",
    displayType: "separate",
    displayRate: "chunk",
}

export default experimentConfig;
```
You can run `pushkin prep` and `pushkin start;` to see your changes. 

#### Modifying `stim.js`

This file controls the stimuli sentences (`sentence`) presented to participants. If you're using the `chunk` display rate, you can also add plus signs (`+`) around words or phrases to define your chunks.

Say you have created the list of sentences for your experiment and marked where you would like each chunk to begin and end.

| sentence                                                                                     |
|----------------------------------------------------------------------------------------------|
| +The brilliant compromise+ is a solution+ which both sides+ could happily agree on.+         |
| +The exhausting trip+ was a vacation+ which my friends+ will barely recover from.+           |
| +The antique painting+ was a piece+ which the critic+ would closely stare at.+               |
| +The careful argument+ was a statement+ which no opponent+ could easily argue with.+         |
| +The charming neighborhood+ was a district+ which young couples+ could comfortably live in.+ |

In order to be able to use these stimuli in the self-paced reading experiment, you must use a table to JSON converter such as [this one](https://tableconvert.com/) to format it correctly for jsPsych. 

Once it has been converted, paste the JSON into the `stim.js` file, which should now look like this:

```javascript
// Example stimuli

const stimArray = [
	{ sentence: '+The brilliant compromise+ is a solution+ which both sides+ could happily agree on.+'},
    { sentence: '+The exhausting trip+ was a vacation+ which my friends+ will barely recover from.+'},
    { sentence: '+The antique painting+ was a piece+ which the critic+ would closely stare at.+'},
    { sentence: '+The careful argument+ was a statement+ which no opponent+ could easily argue with.+'},
    { sentence: '+The charming neighborhood+ was a district+ which young couples+ could comfortably live in.+'}
]

export default stimArray;
```

Run `pushkin prep` and `pushkin start;` again, and your experiment should be ready to go!


