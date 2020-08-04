# Lexical decision template

To install this experiment template, use the command `pushkin install experiment`, then select **lexical**.

* [config info](lexical-decision-template.md#config-js)
* [stim info](lexical-decision-template.md#stim-js)

![Lexical decision experiment template, with corrective response set to true.](../../.gitbook/assets/ezgif.com-video-to-gif-9-.gif)

### config.js

When **correctiveFeedback** is set to true, the bounding box will change color to indicate correctness - green meaning correct, and red meaning incorrect. If set to false, the box remains black.

### stim.js

**word\_1**: Word displayed on top in fixation box

**word\_2**: Word displayed on bottom in fixation box

**both\_words**: If true, 'Y' is the correct answer \(both word\_1 and word\_2 are real words\). If false, one or both of the words is not a real world and the correct answer is 'N'

**related**: If true, the words are related to each other \(e.g. leaf and tree\). If false, the words are unrelated \(e.g. sock and tree\).

