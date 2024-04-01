import React from 'react';
import pushkinClient from 'pushkin-client';
import { initJsPsych } from 'jspsych';
import { connect } from 'react-redux';
import { createTimeline } from './experiment';
import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import jsYaml from 'js-yaml';
const fs = require('fs');

//stylin'
import './assets/experiment.css';
// These are aesthetic settings for the experiment from config.js
const expAesthetics = require('./config').default;
// These are the config settings for the overall Pushkin experiment
// from the config.yaml at the top level of the experiment
const expConfig = jsYaml.load(fs.readFileSync('../config.yaml'), 'utf8');

const pushkin = new pushkinClient();

const mapStateToProps = state => {
  return {
    userID: state.userInfo.userID
  };
}

class quizComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = { loading: true };
  }

  componentDidMount() {
    this.startExperiment();
  }

  async startExperiment() {
    this.setState({ experimentStarted: true });

    await pushkin.connect(this.props.api);

    // If data collection for the experiment is paused, make sure their userID doesn't get saved
    if (expConfig.dataPaused) {
      console.log("Data collection for this experiment is currently paused. No data will be saved.");
    } else {
      await pushkin.prepExperimentRun(this.props.userID);
    }

    const jsPsych = initJsPsych({
      display_element: document.getElementById('jsPsychTarget'),
      on_finish: this.endExperiment.bind(this),
      on_data_update: (data) => {
        // Only call saveStimulusResponse if data collection is not paused
        if (!expConfig.dataPaused) {
          pushkin.saveStimulusResponse(data);
        }
      }
    });

    jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties
    
    const timeline = createTimeline(jsPsych);

    // If data collection for the experiment is paused, insert a confirmation trial notifying the participant
    if (expConfig.dataPaused) {
      const dataPausedTrial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<p>Data collection for this experiment is currently paused.</p>
          <p>You can still view the experiment, but your data will <strong>not</strong> be saved.</p>
          <p>Press any key to continue.</p>`
      }
      timeline.unshift(dataPausedTrial);
    }

    jsPsych.run(timeline);

    document.getElementById('jsPsychTarget').focus();

    // Settings from config.js
    document.getElementById('jsPsychTarget').style.color = expAesthetics.fontColor;
    document.getElementById('jsPsychTarget').style.fontSize = expAesthetics.fontSize;
    document.getElementById('jsPsychTarget').style.fontFamily = expAesthetics.fontFamily;

    this.setState({ loading: false });
  }

  async endExperiment() {
    // If data collection is paused, add an ending note and don't save their completion to the users table
    if (expConfig.dataPaused) {
      document.getElementById("jsPsychTarget").innerHTML = `<p>Thank you for your interest in this experiment!</p>
        <p>Data collection is currently paused. No data were saved.</p>`;
    } else {
      document.getElementById("jsPsychTarget").innerHTML = "<p>Processing...</p>";
      await pushkin.tabulateAndPostResults(this.props.userID, expConfig.experimentName);
      document.getElementById("jsPsychTarget").innerHTML = "<p>Thank you for participating!</p>";
    }
  }

  render() {

    return (
      <div>
        {this.state.loading && <h1>Loading...</h1>}
        <div id="jsPsychTarget" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(quizComponent);
