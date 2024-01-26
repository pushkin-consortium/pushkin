export const SET_USER_ID = 'SET_USER_ID';
export const GET_SESSION_USER = 'GET_SESSION_USER';
export const GET_USER = 'GET_SESSION_USER';

export function getSessionUser() {
  return {
    type: GET_SESSION_USER
  };
}

export function getUser(isAuthenticated, user) {
  return {
    type: GET_USER,
    isAuthenticated: isAuthenticated,
    user: user
  };
}

export function setUserID(userID) {
  return {
    type: SET_USER_ID,
    id: userID
  };
}
