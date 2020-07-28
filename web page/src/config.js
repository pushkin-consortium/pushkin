// Set configurations for experiment\

/*
Options for displayType:
    -"moving": display full target text on the page, with dashes replacing words/text to mimick reading rate
    -"separate": display each word/chunk of text independently on separate pages.

Options for displayRate:
    -"word" for displaying word-by-word (one word at a time, with remaining words replaced with dashes). Include a number
    -"chunk" for setting your own break points using + signs in your sentence stimuli to indicate chunks of text to be displayed together (i.e. 1 or more words at once), one at a time.
    -"sentence word" for showing sentence by sentence. The last sentence in the stimulus automatically becomes the target sentence, with the words displayed one at a time.
    -"sentence chunk" for showing sentence by sentence. The last sentence in the stimulus automatically becomes the target sentence, with the chunks displayed one at a time - chunks must be separated by + signs.
    -"sentence" without word or chunk, it will default to word.
*/

const experimentConfig = {
    fontColor: "black",
    fontSize: "20px",
    fontFamily: "'Open Sans', 'Arial', sans-serif",
    displayType: "moving",
    displayRate: "word",
}

export default experimentConfig;