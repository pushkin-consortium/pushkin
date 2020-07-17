import jsPsych from 'pushkin-jspsych';
const stimArray = require('./stim').default;
const debrief = require('./debrief').default;
const consent = require('./consent').default;
const experimentConfig = require('./config').default;

const timeline = []

var welcome = {
    type: 'html-keyboard-response',
    stimulus: consent + '<p>Press spacebar to continue.</p>',
    choices: [32]
}

timeline.push(welcome);

var instructions = {
    type: 'html-keyboard-response',
    on_start: function () {
        document.getElementById('jsPsychTarget').focus();
    },
    stimulus: '<p>You will see two sets of sentences displayed like this:</p>' +
        '<p><strong>He went to the bank yesterday.<br/>' +
        'He went the bank yesterday.</strong></p>' +
        '<p>Press T if the top sentence is grammatically correct</p>' +
        '<p>Press B if the bottom sentence is grammatically correct</p>' +
        '<p>Press T to continue.',
    choices: ['t']
}

timeline.push(instructions);

var instructions_2 = {
    type: 'html-keyboard-response',
    stimulus: '<p>In this case you would press B</p>' +
        '<p><strong>The book is very long, doesn\'t it?<br/>' +
        'The book is very long, isn\'t it?</strong></p>' +
        '<p>Press B to continue to the start of the experiment.</p>',
    choices: ['b']
}

timeline.push(instructions_2);

var stimRandomized;
var stim1;
var stim2;

var grammaticality_procedure = {
    timeline: [
        {
            type: 'html-keyboard-response',
            stimulus: '<div class="fixationcross">+</div>',
            choices: jsPsych.NO_KEYS,
            trial_duration: 1000
        },
        {
            type: 'html-keyboard-response',
            stimulus: function () {
                // build randomization for which stim is top and which is bottom
                stim1 = jsPsych.timelineVariable('sentence_grammatical', true);
                stim2 = jsPsych.timelineVariable('sentence_ungrammatical', true);
                var stimBoth = [stim1, stim2];
                stimRandomized = jsPsych.randomization.shuffle(stimBoth);
                console.log('randomized stim: ' + stimRandomized[0]);

                return '<p>Which sentence is grammatically correct?</p><p><strong>' + stimRandomized[0] + '<br />' + stimRandomized[1] + '</strong></p>';
            },
            choices: ['t', 'b'],
            on_finish: function (data) {
                var char_resp = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
                console.log('on finish rando stim! ' + stimRandomized);
                if (stimRandomized[0] == stim1) {
                    data.correct = char_resp == 't';
                } else if (stimRandomized[1] == stim1) {
                    data.correct = char_resp == 'b';
                }
            }
        },
        {
            type: 'html-keyboard-response',
            stimulus: function () {
                var last_correct = jsPsych.data.get().last(1).values()[0].correct;
                if (last_correct && experimentConfig.correctiveFeedback == 'true') {
                    return '<div class="correct"><strong>Correct</strong></div>';
                } else if (!last_correct && experimentConfig.correctiveFeedback == 'true') {
                    return '<div class="incorrect"><strong>Incorrect</strong></div>';
                } else {
                    return '<div class="fixationcross">+</div>';
                }
            },
            choices: jsPsych.NO_KEYS,
            trial_duration: 2000
        }
    ],
    timeline_variables: stimArray,
    randomize_order: true
}

timeline.push(grammaticality_procedure);

var data_summary = {
    type: 'html-keyboard-response',
    stimulus: function () {
        // Calculate performance on task
        var mean_rt = jsPsych.data.get().filter({ correct: true }).select('rt').mean();
        var correctTotal = jsPsych.data.get().filter({ correct: true }).count();

        // Show results and debrief
        return '<p>You got ' + correctTotal + ' sentences correct! Your average response time was: ' + Math.round(mean_rt) + 'ms</p>' +
            debrief
    },
    choices: jsPsych.NO_KEYS
}

timeline.push(data_summary);

export default timeline;