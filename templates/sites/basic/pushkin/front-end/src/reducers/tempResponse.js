import { TEMP_RESPONSE, TEMP_STIMULUS_RESPONSE } from '../actions/tempResponse';

export default function tempResponses(
  state = { tempResponse: [], tempStimulusResponse: [] },
  action
) {
  switch (action.type) {
    case TEMP_RESPONSE: {
      return {
        ...state,
        tempResponse: [...state.tempResponse, action.tempResponse]
      };
    }
    case TEMP_STIMULUS_RESPONSE: {
      return {
        ...state,
        tempStimulusResponse: [
          ...state.tempStimulusResponse,
          action.tempStimulusResponse
        ]
      };
    }
    default:
      return state;
  }
}
