import jsPsych from 'pushkin-jspsych';
const experimentConfig = require('./config').default;
const stimArray = require('./stim').default;
const debrief = require('./debrief.js').default;
const consent = require('./consent.js').default;

const timeline = [];

/* === Welcome/consent page === */
var welcome = {
    type: 'html-keyboard-response',
    stimulus: consent + '<p>Press spacebar to continue.</p>',
    choices: [32]
};

timeline.push(welcome);

/* === Setup for scale trials (likert or slider) === */
// Initialize stim for scale trials
var gramStim;
var ungramStim;
var whichStim;
var correctFeedback;

const combinedArray = [];
for (let i = 0; i < stimArray.length; i++) {
    gramStim = { stim: stimArray[i].sentence_grammatical };
    ungramStim = { stim: stimArray[i].sentence_ungrammatical };
    combinedArray.push(gramStim);
    combinedArray.push(ungramStim);
};

// Initialize likert scale labels
var likert_scale = [
    "1 - Definitely ungrammatical",
    "2 - Probably ungrammatical",
    "3 - Neutral",
    "4 - Probably grammatical",
    "5 - Definitely grammatical"
];

var slider_scale = ['Ungrammatical', "Grammatical"];


/* === Set intro text for scale trials === */
var scaleType;
if (experimentConfig.responseType == 'likert') {
    scaleType = 'a scale from 1-5, where:<br/>' +
        '<strong>1 = ' + likert_scale[0] + '<br/>' +
        '2 = ' + likert_scale[1] + '<br/>' +
        '3 = ' + likert_scale[2] + '<br/>' +
        '4 = ' + likert_scale[3] + '<br/>' +
        '5 = ' + likert_scale[4] + '</strong><br/>'
} else if (experimentConfig.responseType == 'slider') {
    scaleType = 'a slider, where: </p><p><strong>Further left means more ' + slider_scale[0].toLowerCase() +
        '</strong> and <strong>further right means more ' + slider_scale[1].toLowerCase() + '.</strong>'
} else {
    console.log('No scale type specified')
};

var instructions_scales = {
    timeline: [
        {
            type: 'html-keyboard-response',
            on_start: function () {
                document.getElementById('jsPsychTarget').focus();
            },
            stimulus: '<p>In this study, you will be reading sentences and rating how grammatical or ungrammatical you believe they are using ' + scaleType + '</p>' +
                '<p>Press spacebar to begin.</p>',
            choices: [32]
        }
    ]
};


/* === Likert trials === */
var grammaticality_procedure_likert = {
    timeline: [
        {
            type: 'survey-likert',
            preamble: function () {
                whichStim = jsPsych.timelineVariable('stim', true);
                return '<p>How grammatically correct is this sentence?</p><p><strong>' + jsPsych.timelineVariable('stim', true) + '</strong></p>'
            },
            scale_width: '600',
            questions: [
                {
                    prompt: '',
                    name: 'grammatical_likert',
                    labels: likert_scale
                }
            ],
            choices: jsPsych.NO_KEYS,
            on_finish: function () {
                for (let i = 0; i < stimArray.length; i++) {
                    if (stimArray[i].sentence_grammatical.includes(whichStim)) {
                        correctFeedback = true;
                    } else {
                        correctFeedback = false;
                    }
                }
            }
        },
        {
            type: 'html-keyboard-response',
            stimulus: function () {
                if (correctFeedback == true && experimentConfig.correctiveFeedback == 'true') {
                    return '<p class="correct">That sentence was grammatically correct.</p>'
                } else if (correctFeedback == false && experimentConfig.correctiveFeedback == 'true') {
                    return '<p class="incorrect">That sentence was gramatically incorrect.</p>'
                } else {
                    console.log('corrective feedback??? ' + experimentConfig.correctiveFeedback);
                    return '<div class="fixationcross">+</div>'
                }
            },
            choices: jsPsych.NO_KEYS,
            trial_duration: 3000
        },
    ],
    timeline_variables: combinedArray,
    randomize_order: true
};

/* === Slider scale trials, 0-100 === */
var grammaticality_procedure_slider = {
    timeline: [
        {
            type: 'html-slider-response',
            stimulus: function () {
                whichStim = jsPsych.timelineVariable('stim', true);
                return '<p>How grammatically correct is this sentence?</p><p><strong>' + jsPsych.timelineVariable('stim', true) + '</strong></p>'
            },
            labels: slider_scale,
            slider_width: 600,
            min: 0,
            max: 100,
            on_finish: function () {
                for (let i = 0; i < stimArray.length; i++) {
                    if (stimArray[i].sentence_grammatical.includes(whichStim)) {
                        correctFeedback = true;
                    } else {
                        correctFeedback = false;
                    }
                }
            }
        },
        {
            type: 'html-keyboard-response',
            stimulus: function () {
                if (correctFeedback == true && experimentConfig.correctiveFeedback == true) {
                    return '<p class="correct">That sentence was grammatically correct.</p>'
                } else if (correctFeedback == false && experimentConfig.correctiveFeedback == true) {
                    return '<p class="incorrect">That sentence was gramatically incorrect.</p>'
                } else {
                    return '<div class="fixationcross">+</div>'
                }
            },
            choices: jsPsych.NO_KEYS,
            trial_duration: 3000
        },
    ],
    timeline_variables: combinedArray,
    randomize_order: true
};


/* === Debrief for likert and slider scales === */
var debrief_nodata = {
    type: 'html-keyboard-response',
    stimulus: function () {
        return debrief
    },
    choices: jsPsych.NO_KEYS
};


/* === Build 2afc trials === */
var instructions_2afc = {
    timeline: [
        {
            type: 'html-keyboard-response',
            on_start: function () {
                document.getElementById('jsPsychTarget').focus();
            },
            stimulus: '<p>In this study, you will be reading sentences and rating how grammatical or ungrammatical you believe they are using ' + scaleType + '.</p>' +
                '<p>Press spacebar to begin.',
            choices: [32]
        }
    ]
};

var instructions_2afc = {
    timeline: [
        {
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
        },
        {
            type: 'html-keyboard-response',
            stimulus: '<p>In this case you would press B</p>' +
                '<p><strong>The book is very long, doesn\'t it?<br/>' +
                'The book is very long, isn\'t it?</strong></p>' +
                '<p>Press B to continue to the start of the experiment.</p>',
            choices: ['b']
        }
    ]
};

var stimRandomized;
var stim1;
var stim2;

var grammaticality_procedure_2afc = {
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
                return '<p>Which sentence is grammatically correct?</p><p><strong>' + stimRandomized[0] + '<br />' + stimRandomized[1] + '</strong></p>';
            },
            choices: ['t', 'b'],
            on_finish: function (data) {
                var char_resp = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
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
};

var debrief_2afc = {
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
};


/* === Push procedure to timeline based on config responseType setting === */
if (experimentConfig.responseType == '2afc') {
    timeline.push(
        instructions_2afc,
        grammaticality_procedure_2afc,
        debrief_2afc
    );
} else if (experimentConfig.responseType == 'likert') {
    timeline.push(
        instructions_scales,
        grammaticality_procedure_likert,
        debrief_nodata
    );
} else if (experimentConfig.responseType == 'slider') {
    timeline.push(
        instructions_scales,
        grammaticality_procedure_slider,
        debrief_nodata
    );
} else {
    console.log('Error loading trials: the responseType in config.js is invalid')
    // Add no trials
};
timeline.push(
    instructions_2afc,
    grammaticality_procedure_2afc,
    debrief_2afc
);
export default timeline;