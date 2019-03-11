export const TEMP_RESPONSE = 'TEMP_RESPONSE';
export const TEMP_STIMULUS_RESPONSE = 'TEMP_STIMULUS_RESPONSE';

export function sendTempResponse(tempResponse) {
  return {
    type: TEMP_RESPONSE,
    tempResponse
  };
}
export function sendTempStimulusResponse(tempStimulusResponse) {
  return {
    type: TEMP_STIMULUS_RESPONSE,
    tempStimulusResponse
  };
}
