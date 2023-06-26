import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';

const timeline = []

var hello_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 'Hello world!'
}

timeline.push(hello_trial);

export default timeline;