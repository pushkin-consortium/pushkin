import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import { pushkinReducer } from 'pushkin-react';
import error from './error';
import userInfo from './userInfo';
import forum from './forum';
import tempResponses from './tempResponse';
import nextpage from './nextpage';
import { reducer as formReducer } from 'redux-form';

export const rootReducer = combineReducers({
  pushkin: pushkinReducer,
  error,
  nextpage,
  userInfo,
  routing: routerReducer,
  form: formReducer,
  tempResponses,
  forum
});
