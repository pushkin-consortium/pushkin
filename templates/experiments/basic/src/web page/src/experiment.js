import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";

/**
 * Create the jsPsych timeline for the experiment
 * @param {object} jsPsych - jsPsych instance
 * @returns {object[]} - jsPsych timeline
 */
export function createTimeline(jsPsych) {
  // Construct the timeline inside this function just as you would in a standard jsPsych experiment
  const timeline = [];

  const hello_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "Hello, world!",
  };

  timeline.push(hello_trial);

  return timeline;
}
