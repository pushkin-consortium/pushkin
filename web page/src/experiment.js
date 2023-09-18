import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import jsPsychSurveyLikert from '@jspsych/plugin-survey-likert';
import jsPsychHtmlSliderResponse from '@jspsych/plugin-html-slider-response';
import experimentConfig from './config';
import consent from './consent';
import stimArray from './stim';
import debrief from './debrief';

export function createTimeline(jsPsych) {
    // Construct the timeline inside this function just as you would in jsPsych v7.x
    const timeline = [];
    
    // Resize the jsPsychTarget div
    // This will help later with centering the fixation cross relative to other content
    var resizejsPsychTarget = function (divHeight) {
        let jsPsychTarget = document.getElementById('jsPsychTarget');
        jsPsychTarget.style.height = divHeight + 'px';
    };
    // Set the height of the jsPsychTarget div to half the height of the browser window
    // You can play with the multiplier according to the needs of your experiment
    resizejsPsychTarget(window.innerHeight * 0.5);

    // Welcome/consent page
    var welcome = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: consent + '<p>Press spacebar to continue.</p>',
        choices: [' ']
    };
    
    timeline.push(welcome);
    
    // Add grammatical/ungrammatical condition information to stimArray for likert and slider options
    // In practice, this could be pre-determined in a Latin Square design
    // Also add position information for grammatical sentence in 2AFC option
    var itemCondition = jsPsych.randomization.sampleWithReplacement(['grammatical','ungrammatical'], stimArray.length);
    var grammaticalPosition = jsPsych.randomization.sampleWithReplacement(['top','bottom'], stimArray.length);
    for (let i = 0; i < stimArray.length; i++) {
        stimArray[i].condition = itemCondition[i];
        stimArray[i].grammatical_pos = grammaticalPosition[i];
    };
    
    // Initialize Likert scale labels
    var likert_scale = [
        '1 - Definitely ungrammatical',
        '2 - Probably ungrammatical',
        '3 - Neutral',
        '4 - Probably grammatical',
        '5 - Definitely grammatical'
    ];
    
    var slider_scale = ['Ungrammatical','Grammatical'];
    
    // Set up instructions for each type of scale
    var scaleInstructions;
    switch(experimentConfig.responseType) {
        case 'likert':
            scaleInstructions = `a scale from 1 to 5 where:<br>
            <br>${likert_scale.join('<br>').replaceAll('-','=')}`;
            break;
        case 'slider':
            scaleInstructions = `a slider where:<br>
                <br><strong>further left means more ungrammatical</strong>,<br>
                and <strong>further right means more grammatical</strong>.`;
            break;
        default: console.log('No scale type specified')
    };
    
    var instructions_scales = {
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `<p>In this study, you will read sentences and
                    rate how grammatical or ungrammatical they sound to you using ${scaleInstructions}</p>
                    <p>Press spacebar to begin.</p>`,
                choices: [' ']
            }
        ]
    };

    // Set up instructions for 2AFC
    var instructions_2afc = {
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `<p>You will see two sets of sentences displayed like this:</p>
                    <p><strong>He went to the bank yesterday.<br/>
                    He went the bank yesterday.</strong></p>
                    <p>Press T if the top sentence is grammatically correct.</p>
                    <p>Press B if the bottom sentence is grammatically correct.</p>
                    <p>Press T to continue.`,
                choices: ['t']
            },
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: `<p>In this case you would press B.</p>
                    <p><strong>The book is very long, doesn't it?<br/>
                    The book is very long, isn't it?</strong></p>
                    <p>Press B to continue to the start of the experiment.</p>`,
                choices: ['b']
            }
        ]
    };
    
    // Pre-trial fixation cross
    var pre_trial_fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div class="fixationcross">+</div>',
        choices: 'NO_KEYS',
        trial_duration: 1000
    };
    
    // Set up likert/slider feedback
    var scale_trial_feedback = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            if (experimentConfig.correctiveFeedback) {
                if(jsPsych.timelineVariable('condition') == 'grammatical') {
                    return '<p class="correct">That sentence was grammatically correct.</p>';
                } else {
                    return '<p class="incorrect">That sentence was gramatically incorrect.</p>';
                }
            } else {
                return '<div class="fixationcross">+</div>';
            }
        },
        choices: 'NO_KEYS',
        trial_duration: 2000
    };
    
    // Likert trials
    var grammaticality_procedure_likert = {
        timeline: [
            pre_trial_fixation,
            {
                type: jsPsychSurveyLikert,
                data: {
                    condition : jsPsych.timelineVariable('condition'),
                    responseType: 'likert'
                },
                preamble: function () {
                    let sentence;
                    if (jsPsych.timelineVariable('condition') == 'grammatical') {
                        sentence = jsPsych.timelineVariable('sentence_grammatical');
                    } else {
                        sentence = jsPsych.timelineVariable('sentence_ungrammatical');
                    }
                    return `<p>How grammatically correct is this sentence?</p><p><strong>${sentence}</strong></p>`;
                },
                questions: [
                    {
                        prompt: '',
                        name: 'grammatical_likert',
                        labels: likert_scale
                    }
                ]
            },
            scale_trial_feedback
        ],
        timeline_variables: stimArray,
        randomize_order: true
    };
    
    // Slider trials
    var grammaticality_procedure_slider = {
        timeline: [
            pre_trial_fixation,
            {
                type: jsPsychHtmlSliderResponse,
                data: {
                    condition : jsPsych.timelineVariable('condition'),
                    responseType: 'slider'
                },
                stimulus: function () {
                    let sentence;
                    if (jsPsych.timelineVariable('condition') == 'grammatical') {
                        sentence = jsPsych.timelineVariable('sentence_grammatical');
                    } else {
                        sentence = jsPsych.timelineVariable('sentence_ungrammatical');
                    }
                    return `<p>How grammatically correct is this sentence?</p><p><strong>${sentence}</strong></p>`;
                },
                labels: slider_scale,
                min: 0,
                max: 100,
            },
            scale_trial_feedback
        ],
        timeline_variables: stimArray,
        randomize_order: true
    };
    
    // 2AFC trials
    var grammaticality_procedure_2afc = {
        timeline: [
            pre_trial_fixation,
            {
                type: jsPsychHtmlKeyboardResponse,
                data: {
                    responseType: '2afc',
                    grammatical_pos: jsPsych.timelineVariable('grammatical_pos')
                },
                stimulus: function () {
                    let sentence_grammatical = jsPsych.timelineVariable('sentence_grammatical');
                    let sentence_ungrammatical = jsPsych.timelineVariable('sentence_ungrammatical');
                    if (jsPsych.timelineVariable('grammatical_pos') == 'top') {
                        return `<p>Which sentence is grammatically correct?</p>
                            <p><strong>${sentence_grammatical}<br>${sentence_ungrammatical}</strong></p>`;
                    } else {
                        return `<p>Which sentence is grammatically correct?</p>
                            <p><strong>${sentence_ungrammatical}<br>${sentence_grammatical}</strong></p>`;
                    }
                },
                choices: ['t', 'b'],
                on_finish: function (data) {
                    if (data.grammatical_pos == 'top') {
                        data.correct = jsPsych.pluginAPI.compareKeys(data.response, 't');
                    } else {
                        data.correct = jsPsych.pluginAPI.compareKeys(data.response, 'b');
                    }
                }
            },
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function () {
                    let last_correct = jsPsych.data.getLastTrialData().values()[0].correct;
                    if (experimentConfig.correctiveFeedback) {
                        if (last_correct) {
                            return '<div class="correct"><strong>Correct</strong></div>';
                        } else {
                            return '<div class="incorrect"><strong>Incorrect</strong></div>';
                        }
                    } else {
                        return '<div class="fixationcross">+</div>';
                    }
                },
                choices: 'NO_KEYS',
                trial_duration: 2000
            }
        ],
        timeline_variables: stimArray,
        randomize_order: true
    };
    
    // Debrief for likert and slider scales
    var debrief_nodata = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: debrief + '<p>Press spacebar to finish.</p>',
        choices: [' ']
    };

    // Debrief for 2AFC
    var debrief_2afc = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            // Calculate performance on task
            let mean_rt = jsPsych.data.get().filter({responseType: '2afc', correct: true }).select('rt').mean();
            let correctTotal = jsPsych.data.get().filter({responseType: '2afc', correct: true }).count();
            let total = jsPsych.data.get().filter({responseType: '2afc' }).count();

            // Show results and debrief
            return `<p>You were correct on ${correctTotal} of ${total} sentences!
                Your average response time was ${Math.round(mean_rt)} milliseconds.</p>` +
                debrief + '<p>Press spacebar to finish.</p>';
        },
        choices: [' ']
    };
    
    // Push procedure to timeline based on config responseType setting
    switch (experimentConfig.responseType) {
        case '2afc':
            timeline.push(
                instructions_2afc,
                grammaticality_procedure_2afc,
                debrief_2afc
            );
            break;
        case 'likert':
            timeline.push(
                instructions_scales,
                grammaticality_procedure_likert,
                debrief_nodata
            );
            break;
        case 'slider':
            timeline.push(
                instructions_scales,
                grammaticality_procedure_slider,
                debrief_nodata
            );
            break;
        default:
            console.log('Invalid value for responseType in config.js');
    };

    return timeline;
}