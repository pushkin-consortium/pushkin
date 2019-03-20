import React from 'react';
import { Route, Link } from 'react-router-dom';
import Container from '../containers/container';
import TakeQuiz from './TakeQuiz.js';
import fs from 'fs';
import experiments from '../../../experiments.js';

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
