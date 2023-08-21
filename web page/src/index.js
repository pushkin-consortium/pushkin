import React from 'react';
import pushkinClient from 'pushkin-client';
import { initJsPsych } from 'jspsych';
import { connect } from 'react-redux';
import { createTimeline } from './experiment';
import jsYaml from 'js-yaml';
const fs = require('fs');

//stylin'
import './assets/experiment.css';
import experimentConfig from './config';

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
    await pushkin.prepExperimentRun(this.props.userID);

    const jsPsych = initJsPsych({
      display_element: document.getElementById('jsPsychTarget'),
      on_finish: this.endExperiment.bind(this),
      on_data_update: pushkin.saveStimulusResponse(data),
    });

    jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties
    
    const timeline = pushkin.setSaveAfterEachStimulus(createTimeline(jsPsych));

    jsPsych.run(timeline);

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

    return (
      <div>
        {this.state.loading && <h1>Loading...</h1>}
        <div id="jsPsychTarget" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(quizComponent);
