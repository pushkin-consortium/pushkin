import React from 'react';
import fs from 'fs';
import path from 'path';
import experiments from '../../../experiments.js';
const expObject = {};
experiments.forEach(exp => {
	expObject[exp.name] = exp.module;
});

export default class TakeQuiz extends React.Component {
	render() {
		const { match } = this.props;
		const QuizComponent = expObject[match.params.quizName];
		return (<QuizComponent {...this.props} />);
	}
}
