/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

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
import experiments from '../../../experiments/myExperiments.js';

export default class QuizPage extends React.Component {
	render() {
		const { match } = this.props;

		const QuizHome = () => (
			<Container {...this.props}>
				<div>
					<p>Quizzes</p>
					<ul>
						{
							Object.keys(experiments).map( q =>
								(
									<li key={q}>
										<Link to={`${match.url}/${q}`}>{q.split('/')[0]}</Link>
									</li>
								)
							)
						}
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
