# Tutorial: Simple Experiment

## Summary of tutorial content

Pushkin’s modularity means that, in principle, you could probably use any javascript-based experiment engine to write your experiments. However, we highly recommend using [jsPsych](https://www.jspsych.org/). Pushkin has only been extensively tested with jsPsych, and all the documentation currently assumes you are using jsPsych.

The tutorial below starts with a simple lexical decision task written in vanilla jsPsych 7. The tutorial below explains how to modify this code to run in Pushkin. **This is a recommended tutorial for learning the ropes, but a more complete experiment template for lexical decision is available to install through Pushkin ([**read more**](../advanced/modifying-experiment-templates/lexical-decision-template.md))**

If you are not familiar with jsPsych, please consult the [documentation](https://www.jspsych.org/) first. We recommend you also walk through some of the tutorials.

### Initial code

We will start with a simple lexical decision experiment. The code has been adapted from the experiment [here](https://github.com/jodeleeuw/bigcog-lexical-decision/) in order to be compatible with jsPsych 7. You can save the code below as an .html file to run it as a standalone jsPsych experiment:

```markup
<!DOCTYPE html>
<html>
  <head>
    <title>My experiment</title>
    <script src="https://unpkg.com/jspsych@7.3.3"></script>
    <script src="https://unpkg.com/@jspsych/plugin-html-keyboard-response@1.1.2"></script>
    <link href="https://unpkg.com/jspsych@7.3.3/css/jspsych.css" rel="stylesheet" type="text/css"/>
    <style>
      .fixation { border: 2px solid black; height: 100px; width: 200px; font-size: 24px; position: relative; margin: auto; }
      .fixation p { width: 100%; position: absolute; margin: 0.25em;}
      .fixation p.top { top: 0px; }
      .fixation p.bottom { bottom: 0px; }
      .correct { border-color: green;}
      .incorrect { border-color: red; }
    </style>
  </head>
  <body></body>
  <script>

    const jsPsych = initJsPsych();

    const timeline = [];

    var welcome = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: consent + '<p>Press spacebar to continue.</p>',
      choices: [' ']
    };

    timeline.push(welcome);

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
        {
          type: jsPsychHtmlKeyboardResponse,
          stimulus: '<div class="fixation"></div>',
          choices: 'NO_KEYS',
          trial_duration: 1000
        },
        {
          type: jsPsychHtmlKeyboardResponse,
          stimulus: function () {
            let first_word = jsPsych.timelineVariable('word_1');
            let second_word = jsPsych.timelineVariable('word_2');
            first_word = '<div class="fixation"><p class="top">' + first_word + '</p>';
            second_word = '<div class="fixation"><p class="bottom">' + second_word + '</p>';
            return first_word + second_word;
          },
          choices: ['y', 'n'],
          data: {
            both_words: jsPsych.timelineVariable('both_words'),
            related: jsPsych.timelineVariable('related')
          },
          on_finish: function (data) {
            if (data.both_words) {
              data.correct = jsPsych.pluginAPI.compareKeys(data.response, 'y');
            } else {
              data.correct = jsPsych.pluginAPI.compareKeys(data.response, 'n');
            }
          }
        },
        {
          type: jsPsychHtmlKeyboardResponse,
          stimulus: function () {
            let last_correct = jsPsych.data.getLastTrialData().values()[0].correct;
            if (last_correct) {
              return '<div class="fixation correct"></div>';
            } else {
              return '<div class="fixation incorrect"></div>';
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

    var data_summary = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
          // Calculate performance on task
          let correct_related = jsPsych.data.get().filter({ related: true, correct: true }).count();
          let total_related = jsPsych.data.get().filter({ related: true }).count();
          let mean_rt_related = jsPsych.data.get().filter({ related: true, correct: true }).select('rt').mean();

          let correct_unrelated = jsPsych.data.get().filter({ related: false, both_words: true, correct: true }).count();
          let total_unrelated = jsPsych.data.get().filter({ related: false, both_words: true }).count();
          let mean_rt_unrelated = jsPsych.data.get().filter({ related: false, both_words: true, correct: true }).select('rt').mean();


          // Show results and debrief
          let results = `<p>You were correct on ${correct_related} of ${total_related} related word pairings!
            Your average correct response time for these was ${Math.round(mean_rt_related)} milliseconds.</p>
            <p>For unrelated word pairings, you were correct on ${correct_unrelated} of ${total_unrelated}!
            Your average correct response time for these was ${Math.round(mean_rt_unrelated)} milliseconds.</p>`
          return results + debrief
      },
      choices: 'NO_KEYS'
    };

    timeline.push(data_summary);

    jsPsych.run(timeline);
  </script>
</html>
```

### Move the timeline

Follow the [Quickstart](./quickstart/README.md) through `pushkin install site` or navigate to the root directory of an existing site. Create a new experiment named "lex" and select the latest version of the basic template:

```bash
pushkin install experiment
```

You should now have a folder `experiments/lex` with the following content:

```text
└── lex
    ├── api controllers
    ├── config.yaml
    ├── LICENSE
    ├── migrations
    ├── README.md
    ├── web page
    │    └── src
    │         ├── assets
    │         ├── experiment.js
    │         └── index.js
    └── worker
```

Open `experiment.js`. It should look like this:

```javascript
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";

export function createTimeline(jsPsych) {
  const timeline = [];

  var hello_trial = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: "Hello world!",
  };

  timeline.push(hello_trial);

  return timeline;
}
```

From the jsPsych code [above](#initial-code), copy everything between `const timeline = []` and `jsPsych.run(timeline);` (excluding those lines). Paste those lines into `/experiments/lex/web page/src/experiment.js` (replacing the existing content) between `const timeline = []` and `return timeline`. Thus you should now have a function `createTimeline()` within which you build up and finally return the timeline for the experiment.

### Import plugins

In the jsPsych code [above](#initial-code), plugins are loaded within script tags. In a Pushkin experiment, plugins are loaded with `import` statements. The basic template already includes the html-keyboard-response plugin as a dependency, so no additional modifications are needed. However, if you wanted to add additional jsPsych plugins to this experiment, you would need to add them as dependencies and import them in `experiment.js` following the procedure described [here](../advanced/modifying-experiment-templates/README.md#adding-additional-jspsych-plugins).

### Static assets

The tutorial above does not require any images or videos. To use static assets, put them in the experiment assets folder \(web page/src/assets\). Running `pushkin prep` will place them in an accessible public folder. This folder can be referred to using the environment variable `process.env.PUBLIC_URL`.

For example:

```javascript
var test_stimuli = [
  { stimulus: process.env.PUBLIC_URL + "/blue.png" },
  { stimulus: process.env.PUBLIC_URL + "/orange.png" },
];
```

No special imports are required.

Note that this works for local development. Depending on how you deploy to the web, this environment variable may not be available.
