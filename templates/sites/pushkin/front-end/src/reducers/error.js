import { ERROR } from '../actions/error';

export default function error(state = { data: null }, action) {
  switch (action.type) {
    case ERROR:
      return {
        ...state,
        data: action.err
      };
    default:
      return state;
  }
}
