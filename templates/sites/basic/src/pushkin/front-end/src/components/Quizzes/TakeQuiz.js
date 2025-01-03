import React from 'react';
import { useParams } from 'react-router-dom';
import experiments from '../../experiments.js';
import { connect } from 'react-redux';
import { CONFIG } from '../../config';

const expObject = {};
experiments.forEach((exp) => {
  expObject[exp.shortName] = exp.module;
});

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

const TakeQuiz = (props) => {
  const { quizName } = useParams();
  const QuizComponent = expObject[quizName];
  return (
    <div>
      <QuizComponent {...props} api={`${CONFIG.apiEndpoint}/${quizName}`} />
    </div>
  );
};

export default connect(mapStateToProps)(TakeQuiz);
