.. _simpleExperiment:

Summary of tutorial content
================

Pushkin's modularity means that, in principle, you could porbably use any javascript-based experiment engine to write your expeirments. However, we highly recommend using `jsPsych <https://www.jspsych.org>`_. Pushkin has only been extensively tested with jsPsych, and all the documentation currently assumes you are using jsPsych. 

jsPsych provides a `tutorial <https://www.jspsych.org/tutorials/rt-task/>`_ for putting together a simple lexical decision experiment. The tutorial below explains how to modify this code to run on Pushkin.

Initial code
################ 

If you are not familiar with jsPsych, please consult the `documentation <https://www.jspsych.org>`_ first. We recommend you also walk through some of the tutorials. 

Below, we will adapt a simple lexical decision experiment. The original code can be found `here <https://github.com/jodeleeuw/bigcog-lexical-decision/>`. This repository consists of the base jsPsych installation and a single HTML file:

.. code-block:: javascript

  <!DOCTYPE html>
  <html>
    <head>
      <script src="jspsych/jspsych.js"></script>
      <script src="jspsych/plugins/jspsych-html-keyboard-response.js"></script>
      <link rel="stylesheet" href="jspsych/css/jspsych.css">
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
      var timeline = [];

      var welcome = {
        type: 'html-keyboard-response',
        stimulus: '<p>Welcome to the experiment. Please press C to continue.</p>',
        choices: ['c']
      }

      timeline.push(welcome);

      var instructions = {
        type: 'html-keyboard-response',
        stimulus: '<p>You will see two sets of letters displayed in a box, like this:</p>'+
          '<div class="fixation"><p class="top">HELLO</p><p class="bottom">WORLD</p></div>'+
          '<p>Press Y if both sets are valid English words. Press N if one or both is not a word.</p>'+
          '<p>Press Y to continue.</p>',
        choices: ['y']
      }

      timeline.push(instructions);

      var instructions_2 = {
        type: 'html-keyboard-response',
        stimulus: '<p>In this case you would press N</p>'+
          '<div class="fixation"><p class="top">FOOB</p><p class="bottom">ARTIST</p></div>'+
          '<p>Press N to continue to the start of the experiment.</p>',
        choices: ['n']
      }

      timeline.push(instructions_2);

      var trials = [
        {word_1: 'SOCKS', word_2: 'SHOE', both_words: true, related: true},
        {word_1: 'SLOW', word_2: 'FAST', both_words: true, related: true},
        {word_1: 'QUEEN', word_2: 'KING', both_words: true, related: true},
        {word_1: 'LEAF', word_2: 'TREE', both_words: true, related: true},

        {word_1: 'SOCKS', word_2: 'TREE', both_words: true, related: false},
        {word_1: 'SLOW', word_2: 'SHOE', both_words: true, related: false},
        {word_1: 'QUEEN', word_2: 'FAST', both_words: true, related: false},
        {word_1: 'LEAF', word_2: 'KING', both_words: true, related: false},

        {word_1: 'AGAIN', word_2: 'PLAW', both_words: false, related: false},
        {word_1: 'BOARD', word_2: 'TRUDE', both_words: false, related: false},
        {word_1: 'LIBE', word_2: 'HAIR', both_words: false, related: false},
        {word_1: 'MOCKET', word_2: 'MEET', both_words: false, related: false},
        
        {word_1: 'FLAFF', word_2: 'PLAW', both_words: false, related: false},
        {word_1: 'BALT', word_2: 'TRUDE', both_words: false, related: false},
        {word_1: 'LIBE', word_2: 'NUNE', both_words: false, related: false},
        {word_1: 'MOCKET', word_2: 'FULLOW', both_words: false, related: false}
      ]

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
            stimulus: function(){
              return '<div class="fixation"><p class="top">'+jsPsych.timelineVariable('word_1', true)+'</p><p class="bottom">'+jsPsych.timelineVariable('word_2', true)+'</p></div>';
            },
            choices: ['y','n'],
            data: {
              both_words: jsPsych.timelineVariable('both_words'),
              related: jsPsych.timelineVariable('related')
            },
            on_finish: function(data){
              var char_resp = jsPsych.pluginAPI.convertKeyCodeToKeyCharacter(data.key_press);
              if(data.both_words){
                data.correct = char_resp == 'y';
              } else {
                data.correct = char_resp == 'n';
              }
            }
          },
          {
            type: 'html-keyboard-response',
            stimulus: function(){
              var last_correct = jsPsych.data.get().last(1).values()[0].correct;
              if(last_correct){
                return '<div class="fixation correct"></div>';
              } else {
                return '<div class="fixation incorrect"></div>';
              }
            },
            choices: jsPsych.NO_KEYS,
            trial_duration: 2000
          }
        ],
        timeline_variables: trials,
        randomize_order: true
      }

      timeline.push(lexical_decision_procedure);

      var data_summary = {
        type: 'html-keyboard-response',
        stimulus: function(){
          var mean_rt_related = jsPsych.data.get().filter({related:true, both_words:true, correct: true}).select('rt').mean();
          var mean_rt_unrelated = jsPsych.data.get().filter({related:false, both_words:true, correct: true}).select('rt').mean();
          return '<p>Average response time for related words: '+Math.round(mean_rt_related)+'ms</p>'+
            '<p>Average response time for unrelated words: '+Math.round(mean_rt_unrelated)+'ms</p>'
        },
        choices: jsPsych.NO_KEYS
      }

      timeline.push(data_summary);

      jsPsych.init({
        timeline: timeline
      })
    </script>
  </html>

Move the timeline
----------------------
Navigate to your pushkin project and create a new stub experiment:

.. code-block:: bash
  $ pushkin experiment basic lex

You should now have a folder ``experiments/lex`` with the following content:

::

   └── myexp
       ├── api controllers
       ├── config.yaml
       ├── migrations
       ├── seeds
       ├── web page
       │    ├── package-lock.json
       │    ├── package.json
       │    └── src
       │         ├── assets
       │         ├── experiment.js
       │         └── index.js
       └── worker

Open ``experiment.js``. It should look like this:

.. code-block:: javascript
  
  import jsPsych from 'pushkin-jspsych';

  const timeline = []

  var hello_trial = {
      type: 'html-keyboard-response',
      stimulus: 'Hello world!'
  }

  timeline.push(hello_trial);

  export default timeline;

From the jsPsych tutorial, copy everything between ``var timeline = []`` and ``jsPsych.init({``. Use this code to replace the code in ``new/web page/src/experiment.js`` that is between ``const timeline = []`` and ``export default timeline``. Note that the definition of the timeline and the exports still need to be in your file!

Import plugins
----------------------
In the HTML file at the start of this tutorial, plugins are loaded as scripts inside javascript tags. To load plugins for use with Pushkin, use the ``loadScripts()`` method provided by pushkin-client. Open ``new/web page/src/index.js``. Towards the middle of the document, you will see:

.. code-block:: javascript
  
  async startExperiment() {
    this.setState({ experimentStarted: true });

    jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties
    await pushkin.connect('/api/pushkintemplate');
    await pushkin.prepExperimentRun(this.props.userID);
    await pushkin.loadScripts([
      'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-keyboard-response.js',
    ]);


This loads the ``jspsych-html-keyboard-response.js`` plugin provided with jsPsych v. 6.0.4. This is hosteed by jsdelivr, which for reasons of its own provides access to javascript files from github repositories. Any version of any official jsPsych plugin can be loaded this way. For more information, see `the jsdelivr documentation <https://www.jsdelivr.com/?docs=gh>`_. 

Static assets
----------------------
The tutorial above does not require any images or videos. To use static assets, put them in the experiment assets folder (`web page/src/assets`). ``Pushkin prep`` will place them in an accessible public folder. This folder can be referred to using the environment variable ``process.env.PUBLIC_URL``.

For example:

.. code-block:: javascript

  var test_stimuli = [
    { stimulus: process.env.PUBLIC_URL+"/blue.png"},
    { stimulus: process.env.PUBLIC_URL+"/orange.png"}
  ];

No special imports are required. 

Note that this works for local development. Depending on how you deploy to the web, this environment variable may not be available.

.. include:: ../links/links.rst
