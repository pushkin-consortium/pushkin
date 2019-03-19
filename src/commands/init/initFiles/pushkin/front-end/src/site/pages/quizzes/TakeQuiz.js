import React from 'react';
import fs from 'fs';
import path from 'path';
const experimentsFile = '../../../experiments.json';
const experiments = {};

try {
	const exps = JSON.parse(fs.readFileSync(experimentsFile));
	exps.forEach(e => {
		experiments[e.name] = require(e.name);
	});
} catch (e) {
	console.error(`Failed to load user experiments: ${e}`);
}

export default class TakeQuiz extends React.Component {
	render() {
		const { match } = this.props;
		const QuizComponent = experiments[match.params.quizName];
		return (<QuizComponent {...this.props} />);
	}
}
