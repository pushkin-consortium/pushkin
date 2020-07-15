import React from 'react';
import pushkinClient from 'pushkin-client';
import jsPsych from 'pushkin-jspsych';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import timeline_basic from './experiment';
import jsYaml from 'js-yaml';
const fs = require('fs');

//stylin'
import './assets/experiment.css'
const experimentConfig = require('./config').default;

const expConfig = jsYaml.safeLoad(fs.readFileSync('../config.yaml'), 'utf8');

const pushkin = new pushkinClient();
window.jsPsych = jsPsych;


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

    jsPsych.data.addProperties({ user_id: this.props.userID }); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties
    await pushkin.connect('/api/lexical');
    await pushkin.prepExperimentRun(this.props.userID);
    await pushkin.loadScripts([
      'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-keyboard-response.js',
      'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-button-response.js',
    ]);
    const timeline = pushkin.setSaveAfterEachStimulus(timeline_basic);
    await jsPsych.init({
      display_element: document.getElementById('jsPsychTarget'),
      timeline: timeline,
      on_finish: this.endExperiment.bind(this),
    });

    document.getElementById('jsPsychTarget').focus();

    // Settings from config file
    document.getElementById('jsPsychTarget').style.color = experimentConfig.fontColor;
    document.getElementById('jsPsychTarget').style.fontSize = experimentConfig.fontSize;
    document.getElementById('jsPsychTarget').style.fontFamily = experimentConfig.fontFamily;
    document.getElementById('jsPsychTarget').style.paddingTop = '15px';

    this.setState({ loading: false });
  }

  async endExperiment() {
    document.getElementById("jsPsychTarget").innerHTML = "Processing...";
    await pushkin.tabulateAndPostResults(this.props.userID, expConfig.experimentName)
    document.getElementById("jsPsychTarget").innerHTML = "Thank you for participating!";
  }

  render() {
    const { match } = this.props;

    return (
      <div>
        {this.state.loading && <h1>Loading...</h1>}
        <div id="jsPsychTarget" />
      </div>
    );
  }
}

export default withRouter(connect(mapStateToProps)(quizComponent));
