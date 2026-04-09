import {
  GET_USER,
  SET_USER_ID,
  SET_AUTH0_USER,
  CLEAR_AUTH_USER
} from '../actions/userInfo';

const initialState = {
  isSessionAuthenticated: false,
  isAuthenticated: false, // Auth0
  user: null,
  userID: null,
  token: null, // Auth0
  authMode: null // 'legacy' or 'auth0'
};

export default function error(state = initialState, action) {
  switch (action.type) {
    case SET_USER_ID:
      return {
        ...state,
        userID: action.id
      };

    case GET_USER:
      return {
        ...state,
        isSessionAuthenticated: action.isSessionAuthenticated,
        user: action.user,
        userID: action.userID || action.user?.id || state.userID,
        authMode: 'legacy'
      };

   case SET_AUTH0_USER:
      console.log("Reducer received SET_AUTH0_USER", action.payload);
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        userID: action.payload.userID || action.payload.user?.sub ||null,
        authMode: 'auth0'
      };

    case CLEAR_AUTH_USER:
      return {
        ...initialState
      };

    default:
      return state;
  }
}
