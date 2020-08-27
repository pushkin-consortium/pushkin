import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config';

const COOKIE_ID = CONFIG.shortName + '_SESSION_ID';
const COOKIE_EXPIRATION_TIME = 2; // after how many days does the cookie expire?
// set to 2 days because we're not trying to surreptituously track people

export default {
  // Create a new Session ID
  // This overwrites whatever session ID, that might be there right now
  new() {
    let sessionId = uuidv4();
    Cookies.set(COOKIE_ID, sessionId, { expires: COOKIE_EXPIRATION_TIME });
    return sessionId;
  },

  // Get a session ID
  // _create: Boolean (optional) Should a new ID be generated when there is none already?
  get(_create) {
    let sessionId = Cookies.get(COOKIE_ID);
    // Create a new session ID when there is none?
    let create = _create !== undefined ? _create : true;

    if (!sessionId && create) {
      sessionId = this.new();
    }

    return sessionId;
  },
};
