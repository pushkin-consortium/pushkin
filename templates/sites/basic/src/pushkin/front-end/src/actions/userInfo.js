export const GET_USER = 'GET_USER';
export const SET_USER_ID = 'SET_USER_ID';
export const SET_AUTH0_USER = 'SET_AUTH0_USER';
export const CLEAR_AUTH_USER = 'CLEAR_AUTH_USER';
export const GET_SESSION_USER = 'GET_SESSION_USER';

// For session or Auth0 user
export function getUser(isSessionAuthenticated, user) {
  return {
    type: GET_USER,
    isSessionAuthenticated,
    user,
    userID: user?.id || null,
  };
}

// For setting userID after saga logic
export function setUserID(id) {
  return {
    type: SET_USER_ID,
    id,
  };
}

// For Auth0 login
export function setAuth0User(user, token) {
  return {
    type: SET_AUTH0_USER,
    payload: {
      user,
      token,
      userID: user?.sub || null,
    },
  };
}

// For logout
export function clearAuthUser() {
  return {
    type: CLEAR_AUTH_USER,
  };
}
