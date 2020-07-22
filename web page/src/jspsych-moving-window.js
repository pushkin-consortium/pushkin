/*
   Example plugin template
   Created by Josh de Leeuw
 */

jsPsych.plugins["moving-window"] = (function () {

    var plugin = {};

    plugin.info = {
        name: "moving-window",
        parameters: {
            words: {
                type: jsPsych.plugins.parameterType.STRING, // BOOL, STRING, INT, FLOAT, FUNCTION, KEYCODE, SELECT, HTML_STRING, IMAGE, AUDIO, VIDEO, OBJECT, COMPLEX
                default: undefined
            },
            key: {
                type: jsPsych.plugins.parameterType.KEYCODE,
                default: 32
            },
            rate: {
                type: jsPsych.plugins.parameterType.STRING,
                default: 'word moving' // options are "word" (show word by word), "chunk" (chunks of words), and "sentence" - multiple sentences, with the final one done either word by word or chunk by chunk. To make sentence word by word, set to "sentence word", to make sentence chunk by chunk set to "sentence chunk". Sentence alone defaults to "sentence word".
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
        var n_sentences;
        var sentence_array = [];
        // if (trial.rate.includes('sentence')) {
        //   // Logic for sentence mode
        //   console.log('Sentence mode')
        //   var sentence_list = trial.words.split('.');
        //   console.log('list of sentences: 1-' + sentence_list[0] + ' 2-' + sentence_list[1] + ' 3-' + sentence_list[2] + '.');
        //   n_sentences = sentence_list.length;
        //   for (let i = 0; i < n_sentences - 2; i++) {
        //     console.log('Sentennjfnea ' + sentence_list[i])
        //     sentence_array.push(sentence_list[i])
        //   }
        //   sentence_array.push(sentence_list[n_sentences - 2]);
        //   console.log('the final sentence array?: ' + sentence_array);
        //   return sentence_array


        function create_moving_window(words, position) {
            if (trial.rate.includes('sentence')) {
                var sentence_holder = words.split('.');
                n_sentences = sentence_holder.length;
                let target_sentence = sentence_holder[n_sentences - 2];


                if (trial.rate.includes('word')) {
                    n_words = target_sentence.split(' ').length;
                    var word_list = target_sentence.split(' ');
                    var stimulus = word_list.map(function (word, index) {
                        if (index == position) {
                            return word;
                        } else {
                            return "-".repeat(word.length);
                        }
                    }).join(' ')
                    let sentence_pre = sentence_holder.splice(0, n_sentences - 2);
                    let sentence_pre2 = sentence_pre.join('.')
                    console.log('sentnecenajk nsdfbjasdbjkbBKJDJKFHKB: ' + sentence_pre2)
                    return sentence_pre2 + '.' + stimulus + '.';

                } else if (trial.rate.includes('chunk')) {
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
                    let sentence_pre = sentence_holder.splice(0, n_sentences - 2);
                    let sentence_pre2 = sentence_pre.join('.')
                    console.log('sentnecenajk nsdfbjasdbjkbBKJDJKFHKB: ' + sentence_pre2)
                    return sentence_pre2 + '.' + stimulus + '.';
                }


            } else {
                // Logic for word-by-word, not sentence mode
                if (trial.rate.includes('word')) {
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
                    // Logic for chunks, not sentence mode
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


        // create a function for showing the stimulus and collecting the response
        function show_stimulus(position) {
            display_element.innerHTML = '<p style="font-size: 24px; font-family:monospace;">' + create_moving_window(trial.words, position) + '</p>';

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
