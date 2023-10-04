import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import jsPsychSelfPacedReading from '@jspsych-contrib/plugin-self-paced-reading';
import experimentConfig from './config';
import consent from './consent';
import stimArray from './stim';
import debrief from './debrief';

export function createTimeline(jsPsych) {
    // Construct the timeline inside this function just as you would in jsPsych v7.x
    const timeline = [];

    // Resize the jsPsychTarget div
    // This will help later with centering content
    // and making sure the SPR canvas doesn't change the page layout
    var resizejsPsychTarget = function (divHeight) {
        let jsPsychTarget = document.getElementById('jsPsychTarget');
        jsPsychTarget.style.height = divHeight + 'px';
    };
    // This will set the height of the jsPsychTarget div to half the height of the browser window
    // You can play with the multiplier according to the needs of your experiment
    resizejsPsychTarget(window.innerHeight * 0.5);
    
    // Add correct answer information to stimArray for comprehension questions
    var correctKey = jsPsych.randomization.sampleWithReplacement(['f','j'], stimArray.length);
    for (let i = 0; i < stimArray.length; i++) {
        // Add the correct key to the end of the array holding the question info
        stimArray[i].comprehension.push(correctKey[i]);
    };
    
    // Welcome/consent page
    var welcome = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: consent + '<p>Press spacebar to continue.</p>',
        choices: [' ']
    };
    timeline.push(welcome);

    // Instruction page
    var instructions = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            let standard_instructions = `<p>In this experiment, you'll read sentences one word at a time. Use the spacebar to advance to the next word.</p>`;
            let comprehension_instructions = `<p>After reading the sentence, you'll be asked a question about what you read. Use the keyboard to respond to the question.</p>`;
            if (experimentConfig.comprehension) {
                return standard_instructions + comprehension_instructions + '<p>Press the spacebar to continue to the experiment.</p>';
            } else {
                return standard_instructions + '<p>Press spacebar to continue to the experiment.</p>';
            }
        },
        choices: [' ']
    };
    timeline.push(instructions);

    // Set up feedback
    // This will later be integrated into the comprehension questions
    var feedback = {
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function () {
                    let last_correct = jsPsych.data.getLastTrialData().values()[0].correct;
                    if (last_correct) {
                        return '<p class="correct"><strong>Correct</strong></p>';
                    } else {
                        return '<p class="incorrect"><strong>Incorrect</strong></p>';
                    }
                },
                choices: 'NO_KEYS',
                trial_duration: 2000
            },
        ],
        // This timeline is only executed if correctiveFeedback is set to true in config.js
        conditional_function: function () {
            return experimentConfig.correctiveFeedback;
        }
    };
    
    // Set up comprehension questions
    // This will later be integrated into the experiment trials
    var comprehension_questions = {
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                data: {comprehension: jsPsych.timelineVariable('comprehension')},
                stimulus: function () {
                    let question = jsPsych.timelineVariable('comprehension')[0];
                    let choice_correct = jsPsych.timelineVariable('comprehension')[1];
                    let choice_incorrect = jsPsych.timelineVariable('comprehension')[2];
                    let correct_key = jsPsych.timelineVariable('comprehension')[3];
                    if (correct_key == 'f') {
                        return `<p>${question}</p><p><strong>F.</strong> ${choice_correct}&emsp;<strong>J.</strong> ${choice_incorrect}</p>`;
                    } else {
                        return `<p>${question}</p><p><strong>F.</strong> ${choice_incorrect}&emsp;<strong>J.</strong> ${choice_correct}</p>`;
                    }
                },
                choices: ['f','j'],
                // Check whether the response was correct
                // compareKeys() will return true if the response key matches the correct key from the timeline variable
                on_finish: function (data) {
                    data.correct = jsPsych.pluginAPI.compareKeys(jsPsych.timelineVariable('comprehension')[3], data.response);
                }
            },
            // Integrate the conditional timeline for feedback
            feedback
        ],
        // This timeline (including the sub-timeline for feedback) is only executed if comprehension is set to true in config.js
        conditional_function: function () {
            return experimentConfig.comprehension;
        }
    };

    // Experiment trials
    var experiment = {
        timeline: [
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: 'Press spacebar when you are ready.',
                choices: [' ']
            },
            {
                type: jsPsychSelfPacedReading,
                // Learn more about the parameters available for this plugin here: https://github.com/jspsych/jspsych-contrib/blob/main/packages/plugin-self-paced-reading/docs/jspsych-self-paced-reading.md
                sentence: jsPsych.timelineVariable('sentence'),
                // Set the size of the SPR canvas to match the size of the jsPsych content area
                canvas_size: function () {
                    let width = document.querySelector('.jspsych-content-wrapper').offsetWidth;
                    let height = document.querySelector('.jspsych-content-wrapper').offsetHeight;
                    return [width, height];
                },
                // For now, all plugins need to generate a data propoerty called "stimulus"
                data: {stimulus: jsPsych.timelineVariable('sentence')},
            },
            // Integrate the conditional timeline for comprehension questions
            comprehension_questions
        ],
        timeline_variables: stimArray,
        randomize_order: true
    };
    timeline.push(experiment);

    // A final feedback and debrief page
    var end = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            // Calculate performance on comprehension questions
            let correct_questions = jsPsych.data.get().filter({ correct: true }).count();
            let total_questions = jsPsych.data.get().filterCustom(function (data) { return Array.isArray(data.comprehension) }).count();
            let mean_correct_rt = jsPsych.data.get().filter({ correct: true }).select('rt').mean();
            
            // Show results and debrief from debrief.js
            let results = `
                <p>You were correct on ${correct_questions} of ${total_questions} questions!
                Your average response time for these was ${Math.round(mean_correct_rt)} milliseconds.</p>
            `
            if (experimentConfig.comprehension) {
                return results + debrief + '<p>Press spacebar to finish.</p>'
            } else {
                return debrief + '<p>Press spacebar to finish.</p>'
            }
        },
        choices: [' ']
    };
    timeline.push(end);

    return timeline;
}