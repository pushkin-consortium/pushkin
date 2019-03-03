/**
 * React Static Boilerplate
 * https://github.com/kriasoft/react-static-boilerplate
 *
 * Copyright © 2015-present Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
import 'babel-polyfill';
import 'whatwg-fetch';

import React from 'react'; // eslint-disable-line no-unused-vars
import ReactDOM from 'react-dom'; // eslint-disable-line no-unused-vars
import FastClick from 'fastclick';
import { Provider } from 'react-redux'; // eslint-disable-line no-unused-vars
import { Route, Switch, BrowserRouter as Router, browserHistory } from 'react-router-dom'; // eslint-disable-line no-unused-vars
//import { syncHistoryWithStore } from 'react-router-redux';
import { rootReducer } from './reducers/index';
import thunkMiddleware from 'redux-thunk';
import { compose, createStore, applyMiddleware } from 'redux';
import { hot } from 'react-hot-loader';
//import { logger } from 'redux-logger';

// Pages / Routing
import HomePage from './pages/home/index';
import About from './pages/about/index';
import Quizzes from './pages/quizzes/index';
import ErrorPage from './pages/error/index';
import Updates from './pages/updates/index';
import Container from './pages/containers/container'; // eslint-disable-line no-unused-vars
import Dashboard from './pages/dashboard/index'; // eslint-disable-line no-unused-vars
import Forum from './pages/forum/index';
import Admin from './pages/admin/index';

import { CONFIG } from './config.js';
import Auth from './core/auth';


export default function configureStore(initialState) {
	const middleWares = [ thunkMiddleware /*, logger*/ ];
	return createStore(
		rootReducer,
		initialState,
		compose(applyMiddleware.apply(this, middleWares))
	);
}

const store = configureStore();
//const history = syncHistoryWithStore(browserHistory, store);

const App = hot(module)( () => ( // eslint-disable-line no-unused-vars
	<Provider store={store}>
		{/*		<Router onUpdate={() => window.scrollTo(0, 0)} history={history}> */}
			<Router>
				<Switch>
					<Route exact path='/' component={HomePage}
						auth={CONFIG.auth}
						showForum={CONFIG.forum}
					/>
					<Route path="/quizzes" component={Quizzes}
						auth={CONFIG.auth}
						showForum={CONFIG.forum}
					/>
					<Route path="/admin" component={Admin}
						auth={CONFIG.auth}
						showForum={CONFIG.forum}
					/>
					<Route path="/about" component={About}
						auth={CONFIG.auth}
						showForum={CONFIG.forum}
					/>
					<Route path="/updates" component={Updates}
						auth={CONFIG.auth}
						showForum={CONFIG.forum}
					/>
					{ CONFIG.forum && (
						<Route path='/forum' component={Forum}
							auth={CONFIG.auth}
							showForum={CONFIG.forum}
						/>
					)}
					{ CONFIG.auth && (
						<Route path="/dashboard" component={Dashboard}
							auth={CONFIG.auth}
							showForum={CONFIG.forum}
						/>
					)}
					<Route path="/error" component={ErrorPage} />
					<Route path="*" component={ErrorPage} />
				</Switch>
			</Router>
		</Provider>
));

/************** go *************/
(function() {
	FastClick.attach(document.body);
	ReactDOM.render(<App />, document.getElementById('container'));
})();


/*if (module.hot) {
	module.hot.accept('./core/routes', () => {
		render(require('./core/routes').routes);
	});
}
*/
