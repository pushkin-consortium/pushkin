# Self-paced reading template

To install this experiment template, use the command `pushkin install experiment`, then select **reading**.

* [config info](self-paced-reading-template.md#config-js)
* [stim info](../users-and-authentication.md#randomly-generated-string)

![Self-paced reading experiment template, with the setting &quot;moving word&quot; \(see below for details\)](../../.gitbook/assets/ezgif.com-video-to-gif-7-.gif)

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

### stim.js

**sentence:** The sentence or text to be read. See above for details on how to note what chunks of words should be displayed together for self-paced reading display rate.

