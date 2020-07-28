/*
   Moving window / self-paced reading plugin template
   Created by Josh de Leeuw
   Adapted by Constance Bainbridge
 */
import jsPsych from 'pushkin-jspsych';


jsPsych.plugins["moving-window"] = (function () {

    var plugin = {};

    plugin.info = {
        name: "moving-window",
        parameters: {
            words: {
                type: jsPsych.plugins.parameterType.STRING,
                default: undefined
            },
            key: {
                type: jsPsych.plugins.parameterType.KEYCODE,
                default: 32
            },
            rate: {
                type: jsPsych.plugins.parameterType.STRING,
                default: 'word moving' // options are "word" (show word by word), "chunk" (chunks of words), and "sentence" - multiple sentences display in full, with the final one a target sentence done either word by word or chunk by chunk. To make sentence word by word, set to "sentence word", to make sentence chunk by chunk set to "sentence chunk". Sentence alone defaults to "sentence word".
            }
        }
    }

    plugin.trial = function (display_element, trial) {

        // initalize some variables
        var trial_data = { words: trial.words }; // data object for the trial
        var n_words; // var to hold number of words in the trial
        var rt = []; // empty array for collecting RTs
        var current_word = 0; // current word


        // create a function for generating the stimulus with moving window
        function create_moving_window(words, position) {

            if (trial.rate.includes('sentence')) {
                // Sentence setting logic
                var sentence_holder = words.split('.');
                n_sentences = sentence_holder.length;
                var target_sentence = sentence_holder[n_sentences - 2];

                if (trial.rate.includes('word')) {
                    // Sentence - word-by-word setting logic
                    n_words = target_sentence.split(' ').length;
                    var word_list = target_sentence.split(' ');
                    var stimulus = word_list.map(function (word, index) {
                        if (index == position) {
                            return word;
                        } else {
                            return "-".repeat(word.length);
                        }
                    }).join(' ')
                    var sentence_pre = sentence_holder.splice(0, n_sentences - 2);
                    var sentence_pre2 = sentence_pre.join('.')
                    return sentence_pre2 + '.' + stimulus + '.';

                } else if (trial.rate.includes('chunk')) {
                    // Sentence - chunk-by-chunk setting logic
                    n_words = target_sentence.split('+').length;
                    var word_list = target_sentence.split('+');
                    var stimulus = word_list.map(function (word, index) {
                        if (index == position) {
                            return word;
                        } else if (word_list.length == 1) {
                            return word;
                        } else {
                            return "-".repeat(word.length);
                        }
                    }).join(' ')
                    var sentence_pre = sentence_holder.splice(0, n_sentences - 2);
                    var sentence_pre2 = sentence_pre.join('.')
                    return sentence_pre2 + '.' + stimulus + '.';
                }


            } else {
                if (trial.rate.includes('word')) {
                    // Logic for word-by-word setting, not sentence mode
                    n_words = trial.words.split(' ').length;
                    var word_list = words.split(' ');
                    var stimulus = word_list.map(function (word, index) {
                        if (index == position) {
                            return word;
                        } else {
                            return "-".repeat(word.length);
                        }
                    }).join(' ')
                    return stimulus;

                } else if (trial.rate.includes('chunk')) {
                    // Logic for chunk-by-chunk setting, not sentence mode
                    n_words = trial.words.split('+').length;
                    var word_list = words.split('+');
                    var stimulus = word_list.map(function (word, index) {
                        if (index == position) {
                            return word;
                        } else if (word_list.length == 1) {
                            return word;
                        } else {
                            return "-".repeat(word.length);
                        }
                    }).join(' ')
                    return stimulus;
                }
            }
        }


        // create a function for generating the stimulus with separate pages per target stim piece
        function create_separate_window(words, position) {

            if (trial.rate.includes('sentence')) {
                // Sentence setting logic
                var sentence_holder = words.split('.');
                n_sentences = sentence_holder.length;
                var target_sentence = sentence_holder[n_sentences - 2];
                target_sentence = target_sentence.substr(1);
                target_sentence = target_sentence + '.';

                if (trial.rate.includes('word')) {
                    // Sentence - word-by-word setting logic
                    var word_list = target_sentence.split(' ');
                    var sentence_pre = sentence_holder.splice(0, n_sentences - 2);
                    var sentence_pre2 = sentence_pre.map(x => x + '.');
                    var total_list = sentence_pre2.concat(word_list);
                    n_words = total_list.length;
                    return total_list[position];

                } else if (trial.rate.includes('chunk')) {
                    // Sentence - chunk-by-chunk setting logic
                    var word_list = target_sentence.split('+');
                    var sentence_pre = sentence_holder.splice(0, n_sentences - 2);
                    var sentence_pre2 = sentence_pre.map(x => x + '.');
                    var total_list = sentence_pre2.concat(word_list);
                    n_words = total_list.length;
                    return total_list[position];

                }


            } else {
                // Logic for word-by-word setting, not sentence mode
                if (trial.rate.includes('word')) {

                    n_words = trial.words.split(' ').length;
                    var word_list = words.split(' ');
                    return word_list[position];
                } else if (trial.rate.includes('chunk')) {

                    // Logic for chunk-by-chunk setting, not sentence mode
                    n_words = trial.words.split('+').length;
                    var word_list = words.split('+');
                    return word_list[position];
                }
            }
        }


        // create a function for showing the stimulus and collecting the response, with logic for separate page presentation or moving window
        function show_stimulus(position) {
            if (trial.rate.includes('separate')) {
                display_element.innerHTML = '<p>' + create_separate_window(trial.words, position) + '</p>';
            } else {
                display_element.innerHTML = '<p>' + create_moving_window(trial.words, position) + '</p>';
            }

            jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: after_response,
                valid_responses: [trial.key],
                rt_method: 'performance',
                persist: false,
                allow_held_key: false
            });
        }

        // create a function for handling a response
        function after_response(response_info) {
            rt.push(response_info.rt);
            current_word++;
            if (current_word == n_words) {
                end_trial();
            } else {
                show_stimulus(current_word);
            }
        }

        // create a function to handle ending the trial
        function end_trial() {
            trial_data.rt = JSON.stringify(rt);

            display_element.innerHTML = "";

            jsPsych.finishTrial(trial_data)
        }

        // show the first stimulus
        show_stimulus(current_word);

    };

    return plugin;
})();
