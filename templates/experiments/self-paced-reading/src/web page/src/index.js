import React from "react";
import { Link } from "react-router-dom";
import PushkinClient from "pushkin-client";
import { initJsPsych } from "jspsych";
import { connect } from "react-redux";
import { createTimeline } from "./experiment";
import ExpResults from "./results";
import jsPsychHtmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import jsYaml from "js-yaml";
import fs from "fs";

// Styling and other configuration options
import "./assets/experiment.css";
// These are aesthetic settings for the experiment from options.js
const expOptions = require("./options").default;
// These are the config settings for the overall Pushkin experiment
// from the config.yaml at the top level of the experiment
const expConfig = jsYaml.load(fs.readFileSync("../config.yaml"), "utf8");

const pushkin = new PushkinClient();

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

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
      console.log(
        "Data collection for this experiment is currently paused. No data will be saved.",
      );
    } else {
      // Wait until userID is not null (necessary for correct data logging in the users and userResults tables)
      // Remove this when a better solution is found (see https://github.com/pushkin-consortium/pushkin/issues/352)
      while (!this.props.userID) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await pushkin.prepExperimentRun(this.props.userID);
    }

    const jsPsych = initJsPsych({
      display_element: document.getElementById("jsPsychTarget"),
      on_finish: (data) => {
        const summary_stat = data.last(1).values()[0].summary_stat;
        this.endExperiment(summary_stat);
      },
      on_data_update: (data) => {
        // Only call saveStimulusResponse if data collection is not paused
        if (!expConfig.dataPaused) {
          pushkin.saveStimulusResponse(data);
        }
      },
    });

    jsPsych.data.addProperties({ user_id: this.props.userID }); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties

    const timeline = createTimeline(jsPsych);

    // If data collection for the experiment is paused, insert a confirmation trial notifying the participant
    if (expConfig.dataPaused) {
      const dataPausedTrial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<p>Data collection for this experiment is currently paused.</p>
          <p>You can still view the experiment, but your data will <strong>not</strong> be saved.</p>
          <p>Press any key to continue.</p>`,
      };
      timeline.unshift(dataPausedTrial);
    }

    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    // Run in simulation mode if the appropriate URL parameter is set
    // and the site is deployed in debug mode
    if (params.get("simulate") === "true" && process.env.DEBUG) {
      // Get the simulation mode: "data-only" (default) or "visual"
      const mode = params.get("mode") || "data-only";
      // Insert data fields indicating simulation mode
      const simulationOptions = {
        default: {
          data: {
            simulation: true,
            mode: mode,
          },
        },
      };
      jsPsych.simulate(timeline, mode, simulationOptions);
    } else {
      jsPsych.run(timeline);
    }

    document.getElementById("jsPsychTarget").focus();

    // Settings from options.js
    document.getElementById("jsPsychTarget").style.color = expOptions.fontColor;
    document.getElementById("jsPsychTarget").style.fontSize = expOptions.fontSize;
    document.getElementById("jsPsychTarget").style.fontFamily = expOptions.fontFamily;

    this.setState({ loading: false });
  }

  async endExperiment(summary_stat) {
    // If data collection is paused, add an ending note and don't save their completion to the users table
    if (expConfig.dataPaused) {
      document.getElementById("jsPsychTarget").innerHTML =
        `<p>Thank you for your interest in this experiment!</p>
        <p>Data collection is currently paused. No data were saved.</p>`;
    } else {
      document.getElementById("jsPsychTarget").innerHTML = "<p>Processing...</p>";
      await pushkin.tabulateAndPostResults(
        this.props.userID,
        expConfig.experimentName,
        summary_stat,
      );
      // Hide the jsPsychTarget div after experiment completion
      document.getElementById("jsPsychTarget").style.display = "none";
    }
    this.setState({ experimentComplete: true });
  }

  render() {
    const currentPath = window.location.pathname;
    const resultsPath = `${currentPath}/results`;
    return (
      <div>
        {this.state.loading && <h1>Loading...</h1>}
        <div id="jsPsychTarget" />
        {this.state.experimentComplete && <p>Thank you for participating!</p>}
        {this.state.experimentComplete && expConfig.showResults && (
          <Link to={resultsPath}>Click to see your results!</Link>
        )}
      </div>
    );
  }
}

export { ExpResults };
export default connect(mapStateToProps)(quizComponent);
