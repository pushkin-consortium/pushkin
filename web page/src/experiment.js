import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
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

    // A welcome page that displays the consent text from consent.js
    var welcome = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: consent + '<p>Press spacebar to continue.</p>',
        choices: [' ']
    };
      
    timeline.push(welcome);
      
    // The first page of instructions
    var instructions_1 = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
          <p>You will see two sets of letters displayed in a box, like this:</p>
          <div class="fixation"><p class="top">HELLO</p><p class="bottom">WORLD</p></div>
          <p>Press Y if both sets are valid English words. Press N if one or both is not a word.</p>
          <p>Press Y to continue.</p>
        `,
        choices: ['y']
    };
      
    timeline.push(instructions_1);

    // The second page of instructions
    var instructions_2 = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
          <p>In this case, you would press N.</p>
          <div class="fixation"><p class="top">FOOB</p><p class="bottom">ARTIST</p></div>
          <p>Press N to begin the experiment.</p>
        `,
        choices: ['n']
    };
      
    timeline.push(instructions_2);
      
    var lexical_decision_procedure = {
        timeline: [
            // Display the box for 1000 ms before the words appear
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: '<div class="fixation"></div>', // See ./assets/experiment.css
                choices: 'NO_KEYS',
                trial_duration: 1000
            },
            // Display the words and wait for a keyboard response
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function () {
                    let first_word = jsPsych.timelineVariable('word_1');
                    let second_word = jsPsych.timelineVariable('word_2');
                    first_word = '<div class="fixation"><p class="top">' + first_word + '</p>';
                    second_word = '<p class="bottom">' + second_word + '</p></div>';
                    return first_word + second_word;
                },
                choices: ['y', 'n'],
                data: {
                    both_words: jsPsych.timelineVariable('both_words'),
                    related: jsPsych.timelineVariable('related')
                },
                // Check whether the response was correct
                on_finish: function (data) {
                    if (data.both_words) {
                        data.correct = jsPsych.pluginAPI.compareKeys(data.response, 'y');
                    } else {
                        data.correct = jsPsych.pluginAPI.compareKeys(data.response, 'n');
                    }
                }
            },
            // Provide feedback if experimentConfig.correctiveFeedback is set to true in config.js
            {
                type: jsPsychHtmlKeyboardResponse,
                stimulus: function () {
                    // Change the color of the box if feedback is enabled
                    if (experimentConfig.correctiveFeedback) {
                        let last_correct = jsPsych.data.getLastTrialData().values()[0].correct;
                        if (last_correct) {
                            return '<div class="fixation correct"></div>';
                        } else {
                            return '<div class="fixation incorrect"></div>';
                        }
                    } else {
                        return '<div class="fixation"></div>';
                    }
                },
                choices: 'NO_KEYS',
                trial_duration: 2000
            }
        ],
        timeline_variables: stimArray,
        randomize_order: true
    };
    
    timeline.push(lexical_decision_procedure);
    
    // A final feedback and debrief page
    var data_summary = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            // Calculate task performance
            let correct_related = jsPsych.data.get().filter({ related: true, correct: true }).count();
            let total_related = jsPsych.data.get().filter({ related: true }).count();
            let mean_rt_related = jsPsych.data.get().filter({ related: true, correct: true }).select('rt').mean();
            
            let correct_unrelated = jsPsych.data.get().filter({ related: false, both_words: true, correct: true }).count();
            let total_unrelated = jsPsych.data.get().filter({ related: false, both_words: true }).count();
            let mean_rt_unrelated = jsPsych.data.get().filter({ related: false, both_words: true, correct: true }).select('rt').mean();
            
            // Show results and debrief from debrief.js
            let results = `
                <p>You were correct on ${correct_related} of ${total_related} related word pairings!
                Your average correct response time for these was ${Math.round(mean_rt_related)} milliseconds.</p>
                <p>For unrelated word pairings, you were correct on ${correct_unrelated} of ${total_unrelated}!
                Your average correct response time for these was ${Math.round(mean_rt_unrelated)} milliseconds.</p>
            `
            return results + debrief + '<p>Press spacebar to finish.</p>'
        },
        choices: [' ']
    };
    
    timeline.push(data_summary);

    return timeline;
}