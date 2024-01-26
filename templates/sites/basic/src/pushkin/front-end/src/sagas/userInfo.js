import { SET_USER_ID, GET_USER } from '../actions/userInfo';
//import { put, takeEvery, takeLatest, all } from 'redux-saga/effects';
import { put, takeLatest } from 'redux-saga/effects';
import session from '../utils/session';

export function* getUserLogic(action) {
  console.log('Saga2 initialized...');
  const id = action.isAuthenticated ? action.user : yield session.get();
  console.log(id);
  yield put({ type: SET_USER_ID, id: id });
}

export function* getUser() {
  yield takeLatest(GET_USER, getUserLogic);
}
