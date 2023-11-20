import { routerReducer } from 'react-router-redux';
import { reducer as formReducer } from 'redux-form';
import { combineReducers } from 'redux';

import error from './error';
import userInfo from './userInfo';
import tempResponses from './tempResponse';
import nextPage from './nextPage';

export default combineReducers({
  error,
  nextPage,
  userInfo,
  routing: routerReducer,
  form: formReducer,
  tempResponses,
});
