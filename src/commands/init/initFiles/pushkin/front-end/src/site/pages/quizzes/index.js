import React from 'react';
import { Route, Link } from 'react-router-dom';
import Container from '../containers/container';
/*
 * Some experiments require a blank page. TakeQuiz simply loads the component
 * of the experiment that's requested and nothing else (e.g. no Container wrapper).
 * Designers of Pushkin experiments can easily and explicitly choose exactly what
 * they want on their experiment page.
*/
import TakeQuiz from './TakeQuiz.js';
import fs from 'fs';
const experimentsFile = '../../../experiments.json';
let experiments;
try {
	experiments = JSON.parse(fs.readFileSync(experimentsFile));
} catch (e) {
	console.error(`Failed to read experiments list: ${e}`);
}

export default class QuizPage extends React.Component {
	render() {
		const { match } = this.props;

		const QuizHome = () => (
			<Container {...this.props}>
				<div>
					<p>Quizzes</p>
						<ul>
							{ experiments.map(e =>
								(<li key={e}>
									<Link to={`${match.url}/${e.mountPath}`}>{e.name}</Link>
								</li>)
							) }
							</ul>
							</div>
						</Container>
		);

		return (
			<div>
				<Route exact path={match.path} component={QuizHome} />
				<Route path={`${match.path}/:quizName`} component={TakeQuiz} />
			</div>
		);
	}
}
