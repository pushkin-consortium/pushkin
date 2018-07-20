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
import quizzes from '../quizzes/quizzes.js';

import test from "../quizzes/test/index"

// const quizRoutes = quizzes.map(
// 	q => (<Route path={`/quizzes/${q}`} component={require('../quizzes/bloodmagic')} />)
// );
const test = require('../pages/about');


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

const ContainerC = props => (
	<Container auth={authSwitcher()} showForum={CONFIG.forum} {...props} />
);
const ForumC = ( <Route path="/forum" component={Forum} /> );
const DashboardC = props => ( <Dashboard config={CONFIG} {...props} /> );

export const routes = (
	<Route exact path='/' component={ContainerC} />

	{ CONFIG.forum && ( <Route path='/forum' component={ForumC} /> ) }
	{ CONFIG.auth && ( <Route path="/dashboard" component={DashboardC} /> ) }


	<Route path="/quizzes" component={Quizzes} />
	<Route path="/admin" component={Admin} />
	<Route path="/about" component={About} />
	<Route path="/updates" component={Updates} />
	<Route path="/error" component={ErrorPage} />
	<Route path="*" component={ErrorPage} />


	<Route path="/quizzes/test" component={test} />
);



/* Add to ForumQuestion component instead (React v4 routing)
				<Route path="posts/:id" component={ForumQuestion} />*/
