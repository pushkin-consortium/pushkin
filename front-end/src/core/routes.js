import { Route, IndexRoute } from 'react-router';
import React from 'react';
import About from '../pages/about/index';
import ErrorPage from '../pages/error/index';
import HomePage from '../pages/home/index';
import Quizzes from '../pages/quizzes/index';
{/*import QuizWrapper from '../components/QuizWrapper/index';*/}
import Updates from '../pages/updates/index';
import Container from '../pages/containers/container';
import Dashboard from '../pages/dashboard/index';
import Forum from '../pages/forum/index';
import ForumQuestion from '../components/ForumPostContent/index';
import Admin from '../pages/admin/index';
import Auth from './auth';
import { CONFIG } from '../config';
// Pass in a component, and the quiz name
import ForumWrapper from '../components/ForumWrapper/index';

const fs = require('fs');

const quizRoutes = fs.readFileSync('quizzes.txt').toString().split('\n')
	.filter( line => line.trim()[0] != '#' )
	.map( quiz => (<Route path={`/quizzes/${quiz}`} component={require(`../quizzes/${quiz}`)} />) );

// Any quiz passed to forum wrapper just needs to call `this.props.mountCurrentQuestion` with an object
// that object needs to have a `question property, and a prompt within that at a minimum
// when using jspsych, just pass up the current question
// 
// class  DummyQuiz extends React.Component {
//   advance = () => {
//     const current = {
//       question: {
//         prompt: 'Test Prompt'
//       }
//     }
//     this.props.mountCurrentQuestion(current)
//   }
//   render() { 
//     return (<div>
//       <button onClick={this.advance} >Advance</button>
//       </div>
//     )
//   }
// }


function authSwitcher() {
	const auth = new Auth();
	return CONFIG.auth ? auth : null;
}


export const routes = (
	<Route
		path="/"
		component={props => (
			<Container auth={authSwitcher()} showForum={CONFIG.forum} {...props} />
		)}
	>
		<IndexRoute component={HomePage} />

		{/*
	  <Route path="/quizzes" component={Quizzes}>
		<Route path="/quizzes/listener-quiz" component={listener-quiz} />
	  </Route>
	  This method of nesting routes is good if you want all children of a particular route to still cause the relevant menu bar tab to remain in the active css configuration when you progress to a child. I.e. /quizzes and /quizzes/listener-quiz both make the quiz tab in the menu bar display as active. Note how below I'll declare the same routes but not nest them, as I don't want the active class to be inherited.
	  */}
		<Route path="/quizzes" component={Quizzes} />
		{quizRoutes}
		
		{CONFIG.auth && (
			<Route
				path="/dashboard"
				component={props => <Dashboard config={CONFIG} {...props} />}
			/>
		)}

		{CONFIG.forum && (
			<Route path="/forum" component={Forum}>
				<Route path="posts/:id" component={ForumQuestion} />
			</Route>
		)}

		<Route path="/admin" component={Admin} />
		<Route path="/about" component={About} />
		<Route path="/updates" component={Updates} />
		<Route path="/error" component={ErrorPage} />
		<Route path="*" component={ErrorPage} />
	</Route>
);
