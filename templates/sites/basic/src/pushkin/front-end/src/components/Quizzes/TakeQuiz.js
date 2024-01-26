import React from 'react';
import { useParams } from 'react-router-dom'
import experiments from '../../experiments.js';
import { connect } from 'react-redux';
import { CONFIG } from '../../config';


const expObject = {};
experiments.forEach(exp => {
  expObject[exp.shortName] = exp.module;
});

const mapStateToProps = state => {
  return {
    userID: state.userInfo.userID
  };
};

const TakeQuiz = (props) => {
  let { quizName } = useParams()
  const QuizComponent = expObject[quizName];
  console.log(CONFIG.apiEndpoint.concat(quizName))
  return (
    <div>
      <QuizComponent {...props} api={CONFIG.apiEndpoint.concat('/').concat(quizName)} />
    </div>
  );
}

export default connect(mapStateToProps)(TakeQuiz);
