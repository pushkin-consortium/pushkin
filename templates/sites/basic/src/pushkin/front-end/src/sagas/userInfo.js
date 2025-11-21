import { SET_USER_ID, GET_USER } from '../actions/userInfo';
import { put, takeLatest } from 'redux-saga/effects';
import session from '../utils/session';

export function* getUserLogic(action) {
  console.log('Saga2 initialized...');

  try {
    let userId;

    if (action.isAuthenticated && action.user) {
      userId = action.user.sub || action.user.email;
      console.log("Using Auth0 user ID:", userId);
    } else {
      userId = session.get(); // no need for yield/call since it's sync
      console.log("Using session-based user ID:", userId);
    }

    yield put({ type: SET_USER_ID, id: userId });

  } catch (error) {
    console.error('Error in getUserLogic saga:', error);
    // Optional: dispatch an error action
  }
}

export function* getUser() {
  yield takeLatest(GET_USER, getUserLogic);
}
