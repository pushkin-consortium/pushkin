// ./src/index.js

// Some legacy browser support
import 'react-app-polyfill/ie9';
import 'react-app-polyfill/stable';

// Basic react imports
import React from 'react';
import { render } from 'react-dom';
import { Router } from 'react-router-dom';

// redux
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './reducers/index';
import rootSaga from './sagas/index';

//Stylin
import './index.css'; // drop??
import './styles/styles.less'; //Bootstrap styles

//utilities
//import history from './utils/history';
import * as serviceWorker from './serviceWorker';
import { Auth0Provider } from './utils/react-auth0-spa';
import App from './App';
import { CONFIG } from './config';

import { createBrowserHistory } from 'history';
const customHistory = createBrowserHistory();

const sagaMiddleware = createSagaMiddleware();
const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(rootSaga);

// A function that routes the user to the right place
// after login
const onRedirectCallback = appState => {
  customHistory.push(
    appState && appState.targetUrl
      ? appState.targetUrl
      : window.location.pathname
  );
};

//Renders the front end
render(
  <Auth0Provider
    domain={CONFIG.authDomain}
    client_id={CONFIG.authClientID}
    redirect_uri={window.location.origin}
    onRedirectCallback={onRedirectCallback}
  >
    <Provider store={store}>
      <Router history={customHistory}>
        <App />
      </Router>
    </Provider>
  </Auth0Provider>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
