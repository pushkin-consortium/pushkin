import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';

export function createTimeline(jsPsych) {
    const timeline = []

    var hello_trial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: 'Hello, world!'
    }

    timeline.push(hello_trial);

    return timeline;
}