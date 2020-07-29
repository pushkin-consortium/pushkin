# Modifying Experiment Templates

* [General settings and editing content](modifying-experiment-templates.md#general-settings-and-editing-content)
* [Lexical decision template](modifying-experiment-templates.md#lexical-decision-template)
* [Grammaticality judgement template](modifying-experiment-templates.md#grammaticality-judgement-template)
* [Self-paced reading template](modifying-experiment-templates.md#self-paced-reading-template)

## General settings and editing content

Most Pushkin native experiment templates will include the following files for editing the settings and content of your experiment. The basic experiment template is the exception, and is a fairly bare bones template for customization.

### config.js

This file contains some settings you can customize for the experiment. Currently, the default settings in every experiment template are:

* **fontColor**: Set the color for the experiment's font. This can be a web color name, a hex color code, or rgb setting. The default setting is "black."
* **fontSize**: Set the font family. This accepts any font family universally available to web browsers.
* **fontFamily**: Set the font family. 

### stim.js

Stimuli are added using the stim.js file, which contains an array to put your stimuli information into.

### consent.js

Add text to this file that you want on your consent page.

### debrief.js

Add text to this file for debrief information at the end of the experiment.

## Lexical decision template

To install this experiment template, use the command `pushkin install experiment`, then select **lexical**.

### config.js

When **correctiveFeedback** is set to true, the bounding box will change color to indicate correctness - green meaning correct, and red meaning incorrect. If set to false, the box remains black.

## Grammaticality judgement template

To install this experiment template, use the command `pushkin install experiment`, then select **grammaticality**.

### config.js

When **correctiveFeedback** is set to true: the two-alternative forced choice question will indicate if participant's response was correct \(in green font\) or not \(in red font\). For the likert scale or slider, text indicating if the sentence was grammatical or ungrammatical will show. For all response types, when this is set to false, a fixation cross appears instead of corrective feedback.

**responseType**: Set whether the response type is 2-alternative forced choice \(set to "2afc"\), 5 item likert scale \(set to "likert"\), or a slider from 0-100 \(set to "slider"\).

## Self-paced reading template

To install this experiment template, use the command `pushkin install experiment`, then select **reading**.

### config.js

**displayType**: Setting for how target words or text are isolated. Option of either:

1. "moving": display full target text on the page, with dashes replacing words/text to mimic reading rate
2. "separate": display each word/chunk of text independently on separate pages.

**displayRate**: Setting for structure of the text and units of target text to be displayed together. Option of:

* "word" for displaying word-by-word \(one word at a time, with remaining words replaced with dashes\).
* "chunk" for setting your own break points using + signs in your sentence stimuli to indicate chunks of text to be displayed together \(i.e. 1 or more words at once\), one at a time. _Be sure to have the + sign before and after each chunk: for example, "+This is+ the target+ sentence.+"_
* "sentence word" for showing sentence by sentence. The last sentence in the stimulus automatically becomes the target sentence, with the words displayed one at a time.
* "sentence chunk" for showing sentence by sentence. The last sentence in the stimulus automatically becomes the target sentence, with the chunks displayed one at a time - chunks must be separated by + signs.
* "sentence" without word or chunk, it will default to word.

