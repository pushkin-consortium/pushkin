import jsPsych from 'pushkin-jspsych';
const experimentConfig = require('./config').default;
const stimArray = require('./stim').default;
const debrief = require('./debrief.js').default;
const consent = require('./consent.js').default;

require("script-loader!./jspsych-moving-window.js");

const timeline = [];

var trial = {
    timeline: [
        {
            type: 'moving-window',
            words: jsPsych.timelineVariable('sentence'),
            rate: 'sentence chunk moving'
        }
    ],
    timeline_variables: stimArray
}

timeline.push(trial)

export default timeline;