import { SET_USER_ID } from '../actions/userInfo';

const initialState = {
  userID: null
};

export default function error(state = initialState, action) {
  switch (action.type) {
    case SET_USER_ID:
      return {
        ...state,
        userID: action.id
      };
    default:
      return state;
  }
}
