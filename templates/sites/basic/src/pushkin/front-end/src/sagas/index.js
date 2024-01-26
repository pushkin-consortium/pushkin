import { all } from 'redux-saga/effects';
import { getUser } from './userInfo';

const delay = ms => new Promise(res => setTimeout(res, ms));

export default function* rootSaga() {
  yield all([getUser()]);
}
