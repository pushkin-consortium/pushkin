//import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';

import error from './error';
import userInfo from './userInfo';
//import { reducer as formReducer } from 'redux-form';
//import { pushkinReducer } from 'pushkin-react';
//import forum from './forum';
//import tempResponses from './tempResponse';
//import nextpage from './nextpage';

export default combineReducers({
  error: error,
  userInfo: userInfo
});
