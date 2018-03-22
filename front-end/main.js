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

import React from 'react';
import ReactDOM from 'react-dom';
import FastClick from 'fastclick';
import { Provider } from 'react-redux';
import { Router, browserHistory } from 'react-router';
import { routes } from './core/routes';
import { syncHistoryWithStore } from 'react-router-redux';
import { rootReducer } from './reducers/index';
import thunkMiddleware from 'redux-thunk';
import { compose, createStore, applyMiddleware } from 'redux';

export default function configureStore(initialState) {
  const middleWares = [thunkMiddleware];
  if (process.env.NODE_ENV === 'development') {
    middleWares.push(require('redux-logger')());
  }

  const store = createStore(
    rootReducer,
    initialState,
    compose(applyMiddleware.apply(this, middleWares))
  );
  // Hot reload reducers (requires Webpack or Browserify HMR to be enabled)
  if (module.hot) {
    module.hot.accept('./reducers', () =>
      store.replaceReducer(require('./reducers/index').rootReducer)
    );
  }
  return store;
}

const store = configureStore();
const history = syncHistoryWithStore(browserHistory, store);

function render(routes) {
  FastClick.attach(document.body);
  ReactDOM.render(
    <Provider store={store}>
      <Router onUpdate={() => window.scrollTo(0, 0)} history={history}>
        {routes}
      </Router>
    </Provider>,
    document.getElementById('container')
  );
}
render(routes);
if (module.hot) {
  module.hot.accept('./core/routes', () => {
    render(require('./core/routes').routes);
  });
}
