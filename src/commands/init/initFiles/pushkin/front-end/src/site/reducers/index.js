import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import error from './error';
import userInfo from './userinfo';
import forum from './forum';
import tempResponses from './tempResponse';
import nextpage from './nextpage';
import { reducer as formReducer } from 'redux-form';

export const rootReducer = combineReducers({
  error,
  nextpage,
  userInfo,
  routing: routerReducer,
  form: formReducer,
  tempResponses,
  forum
});
