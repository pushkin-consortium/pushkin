import { routerReducer } from 'react-router-redux';
import { combineReducers } from 'redux';
import userInfo from './userinfo';
import forum from './forum';
import tempResponses from './tempResponse';
import { reducer as formReducer } from 'redux-form';

export const rootReducer = combineReducers({
  userInfo,
  routing: routerReducer,
  form: formReducer,
  tempResponses,
  forum
});
