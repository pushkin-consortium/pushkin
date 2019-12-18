.. _exp_webpage:

Experiment Web Page Component
==============================
This houses the front-end component of an experiment. A package.json file describes the data here, which is packaged by the CLI and attached to the core website under the location defined by the experiment's config file. Pushkin uses React for the front end. Experiment web pages are mounted as React components and given the full size of the screen.


Basic Experiment Template
=========================
As long as the webpage folder contains an 'index.js' file that includes all your experiment code, you should be set. It is not even necessary for this to use jsPsych. However, we recommend using the structures in the experiment templates (loadable using the `pushkin site`_ command).

The web page ``src`` folder contains two files: ``index.js`` and ``experiment.js``. ``experiment.js`` contains a jsPsych timeline. In the basic template, this is a simple "hello world". For more information about jsPsych timelines, see the jsPsych documentation.

``index.js`` is essentially a wrapper around the timeline. The core functionality of interest is here:

:: code-block: javascript
	
	async startExperiment() {
    this.setState({ experimentStarted: true });

    jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties
    await pushkin.connect('/api/pushkintemplate');
    await pushkin.prepExperimentRun(this.props.userID);
    await pushkin.loadScripts([
      'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-keyboard-response.js',
    ]);
    const timeline = pushkin.setSaveAfterEachStimulus(timeline_basic);
    await jsPsych.init({
      display_element: document.getElementById('jsPsychTarget'),
      timeline: timeline,
      on_finish: this.endExperiment.bind(this),
    });

    document.getElementById('jsPsychTarget').focus();
    this.setState({ loading: false });
  }

  endExperiment() {
    document.getElementById("jsPsychTarget").innerHTML = "Thank you for participating!";
  }

Any jsPsych plugins you need to use should be listed inside ``pushkin.loadScripts()``. All jsPsych plugins should be available through jsdelivr.net. It is fairly self-explanatory: just edit the URL to indicate the jsPsych version and the name of the plugin. 

Another line of code worth noting is ``const timeline = pushkin.setSaveAfterEachStimulus(timeline_basic);``. This uses a helper function from the pushkin-client to save data after each stimulus. This is generally good practice. You could of course write this into the timeline, but this helper function saves some typing. 

Finally, when the timeline finishes ``endExperiment()`` will be called. In the template, this simply adds a "Thank you for participating" message. If one were providing more complex feedback, that could be handled in this function. 