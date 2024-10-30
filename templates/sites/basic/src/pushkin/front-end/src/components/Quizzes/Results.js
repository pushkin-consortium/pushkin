import React from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";
import experiments from "../../experiments.js";
import { CONFIG } from "../../config";

const expObject = {};
experiments.forEach((exp) => {
  expObject[exp.shortName] = exp.results;
});

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

const Results = (props) => {
  const { quizName } = useParams();
  if (!expObject[quizName]) {
    return (
      <div>
        <h1>Sorry, results are not available for this experiment.</h1>
      </div>
    );
  }
  const ExpResults = expObject[quizName];
  return (
    <div>
      <ExpResults {...props} api={`${CONFIG.apiEndpoint}/${quizName}`} />
    </div>
  );
};

export default connect(mapStateToProps)(Results);
