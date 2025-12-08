// ./src/index.js

// Some legacy browser support
import 'react-app-polyfill/ie9';
import 'react-app-polyfill/stable';

// Basic react imports
import React from 'react';
import { createRoot } from 'react-dom/client';
//import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
//import {
//  createBrowserRouter,
//  RouterProvider,
//} from "react-router-dom";

// redux
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './reducers/index';
import rootSaga from './sagas/index';

// Auth0 integration
import { Auth0Provider } from '@auth0/auth0-react';

// //Stylin
// import './index.css'; // drop??
// import './styles/styles.less'; //Bootstrap styles

//utilities
//import history from './utils/history';
import App from './App';
import { CONFIG } from './config';

import { createBrowserHistory } from 'history';
const customHistory = createBrowserHistory();

const sagaMiddleware = createSagaMiddleware();
const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(rootSaga);

// A function that routes the user to the right place
// after login
const onRedirectCallback = (appState) => {
  customHistory.push(
    appState && appState.targetUrl
      ? appState.targetUrl
      : window.location.pathname
  );
};

//Renders the front end
const root = createRoot(document.getElementById('root'));

// Conditionally wrap with Auth0Provider if useAuth is enabled
const AppWithAuth = () => {
  if (CONFIG.useAuth && CONFIG.authDomain && CONFIG.authClientID) {
    return (
      <Auth0Provider
        domain={CONFIG.authDomain}
        clientId={CONFIG.authClientID}
        authorizationParams={{
          redirect_uri: window.location.origin
        }}
        useRefreshTokens={true}
        cacheLocation="localstorage"
      >
        <App />
      </Auth0Provider>
    );
  }
  return <App />;
};

root.render(
  <Provider store={store}>
    <Router>
      <AppWithAuth />
    </Router>
  </Provider>
);
