import jsPsych from 'pushkin-jspsych';

const timeline = []


var hello_trial = {
    type: 'html-keyboard-response',
    stimulus: 'Hello world!'
}

timeline.push(hello_trial);

export default timeline;