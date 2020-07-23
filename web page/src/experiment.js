import jsPsych from 'pushkin-jspsych';
const experimentConfig = require('./config').default;
const stimArray = require('./stim').default;
const debrief = require('./debrief.js').default;
const consent = require('./consent.js').default;

require("script-loader!./jspsych-moving-window.js");

const timeline = []

var welcome = {
    type: 'html-keyboard-response',
    stimulus: consent + '<p>Press spacebar to continue.</p>',
    choices: [32]
};

var instructions = {
    type: 'html-keyboard-response',
    stimulus: '<div>You will be reading excerpts of text, using the spacebar to move through words.</div><br/><div>Press spacebar to continue.</div>'
};

var trial = {
    timeline: [
        {
            type: 'html-keyboard-response',
            stimulus: '<div>Press spacebar when you are ready to read some text.</div>',
        },
        {
            type: 'moving-window',
            words: jsPsych.timelineVariable('sentence'),
            rate: experimentConfig.displayType + experimentConfig.displayRate
        }
    ],
    timeline_variables: stimArray
}

var summary = {
    type: 'html-keyboard-response',
    stimulus: debrief,
    choices: jsPsych.NO_KEYS
}

timeline.push(
    welcome,
    instructions,
    trial,
    summary
)

export default timeline;