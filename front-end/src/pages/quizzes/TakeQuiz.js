import React from 'react';
import quizzes from '../../quizzes/quizzes.js';

export default class TakeQuiz extends React.Component {
	render() {
		const { match } = this.props;
		const QuizComponent = quizzes[match.params.quizName];
		return (<QuizComponent {...this.props} />);
	}
}
