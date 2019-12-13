import React from 'react';
import pushkinClient from 'pushkin-client';
import jsPsych from 'pushkin-jspsych';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import timeline_basic from './experiment';

//stylin'
import './css/experiment.css'

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
    this.props.history.listen(this.endEarly);

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

    this.setState({ loading: false });
  }

  endExperiment() {
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
