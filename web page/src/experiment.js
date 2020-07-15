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
    stimulus: '<p>You will see two sets of letters displayed in a box, like this:</p>' +
        '<div class="fixation"><p class="top">HELLO</p><p class="bottom">WORLD</p></div>' +
        '<p>Press Y if both sets are valid English words. Press N if one or both is not a word.</p>' +
        '<p>Press Y to continue.</p>',
    choices: ['y']
}

timeline.push(instructions);

var instructions_2 = {
    type: 'html-keyboard-response',
    stimulus: '<p>In this case you would press N</p>' +
        '<div class="fixation"><p class="top">FOOB</p><p class="bottom">ARTIST</p></div>' +
        '<p>Press N to continue to the start of the experiment.</p>',
    choices: ['n']
}

timeline.push(instructions_2);

var lexical_decision_procedure = {
    timeline: [
        {
            type: 'html-keyboard-response',
            stimulus: '<div class="fixation"></div>',
            choices: jsPsych.NO_KEYS,
            trial_duration: 1000
        },
        {
            type: 'html-keyboard-response',
            stimulus: function () {
                return '<div class="fixation"><p class="top">' + jsPsych.timelineVariable('word_1', true) + '</p><p class="bottom">' + jsPsych.timelineVariable('word_2', true) + '</p></div>';
            },
            choices: ['y', 'n'],
            data: {
                both_words: jsPsych.timelineVariable('both_words'),
                related: jsPsych.timelineVariable('related')
            },
            on_finish: function (data) {
                var char_resp = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
                if (data.both_words) {
                    data.correct = char_resp == 'y';
                } else {
                    data.correct = char_resp == 'n';
                }
            }
        },
        {
            type: 'html-keyboard-response',
            stimulus: function () {
                var last_correct = jsPsych.data.get().last(1).values()[0].correct;
                if (last_correct && experimentConfig.correctiveFeedback == 'true') {
                    return '<div class="fixation correct"></div>';
                } else if (!last_correct && experimentConfig.correctiveFeedback == 'true') {
                    return '<div class="fixation incorrect"></div>';
                } else {
                    return '<div class="fixation"></div>';
                }
            },
            choices: jsPsych.NO_KEYS,
            trial_duration: 2000
        }
    ],
    timeline_variables: stimArray,
    randomize_order: true
}

timeline.push(lexical_decision_procedure);

var data_summary = {
    type: 'html-keyboard-response',
    stimulus: function () {
        // Calculate performance on task
        var mean_rt_related = jsPsych.data.get().filter({ related: true, both_words: true, correct: true }).select('rt').mean();
        var correct_related = jsPsych.data.get().filter({ related: true, both_words: true, correct: true }).count();

        var mean_rt_unrelated = jsPsych.data.get().filter({ related: false, both_words: true, correct: true }).select('rt').mean();
        var correct_unrelated = jsPsych.data.get().filter({ related: false, both_words: true, correct: true }).count();

        // Show results and debrief
        return '<p>You got ' + correct_related + ' related words correct! Your average response time for related words: ' + Math.round(mean_rt_related) + 'ms</p>' +
            '<p>You got ' + correct_unrelated + ' unrelated words correct! Average response time for unrelated words: ' + Math.round(mean_rt_unrelated) + 'ms</p>' + debrief
    },
    choices: jsPsych.NO_KEYS
}

timeline.push(data_summary);

export default timeline;