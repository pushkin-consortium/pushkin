import React from 'react';
import experiments from '../../../experiments/myExperiments.js';

export default class TakeQuiz extends React.Component {
	render() {
		const { match } = this.props;
		const QuizComponent = experiments[match.params.quizName];
		return (<QuizComponent {...this.props} />);
	}
}
