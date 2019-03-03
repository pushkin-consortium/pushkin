import Axios from 'axios';
import { browserHistory } from 'react-router';
import { error } from './error';
import { sendTempResponse, sendTempStimulusResponse } from './tempResponse';
import Auth from '../core/auth';
import localAxios from './localAxios'

export const SUBMIT_USER_INFO_BEGIN = 'SUBMIT_USER_INFO_BEGIN';
export const SUBMIT_USER_INFO_SUCCESS = 'SUBMIT_USER_INFO_SUCCESS';
export const SUBMIT_COMMENTS_BEGIN = 'SUBMIT_COMMENTS_BEGIN';
export const SUBMIT_COMMENTS_SUCCESS = 'SUBMIT_COMMENTS_SUCCESS';
export const USER_ID = 'USER_ID';
export const LOGIN_REQUEST = 'LOGIN_REQUEST';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_ERROR = 'LOGIN_ERROR';
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';
export const GENERATE_QUIZ_USER = 'GENERATE_QUIZ_USER';
export const LOGIN_LOCATION = 'LOGIN_LOCATION';
export const TEMP_USER_ID = 'TEMP_USER_ID';
export const RESET_PASSWORD_EMAIL_SENT = 'RESET_PASSWORD_EMAIL_SENT';
export const UPDATING_USER = 'UPDATING_USER';
export const RECEIVED_USER_DATA = 'RECEIVED_USER_DATA';

const auth = new Auth();


function loginRequest() {
  return {
    type: LOGIN_REQUEST
  };
}
function loginError(error) {
  return {
    type: LOGIN_ERROR,
    error
  };
}
function resetPasswordEmailSent() {
  return {
    type: RESET_PASSWORD_EMAIL_SENT
  };
}
export function login() {
  auth.lock.show();
  return dispatch => {
    return dispatch(loginRequest());
  };
}
export function loginSuccess(profile) {
  return {
    type: LOGIN_SUCCESS,
    profile
  };
}

export function loginLocation(location) {
  return {
    type: LOGIN_LOCATION,
    location
  };
}
export function checkLogin(location) {
  return (dispatch, getState) => {
    return auth
      .checkLogin()
      .then(() => {
        return dispatch(getUserInfo());
      })
      .catch(err => {
        return dispatch(error(err));
      });
  };
}
export function resetPassword(email) {
  return dispatch => {
    return auth.resetPassword(email).then(resp => {
      swal(resp.data, null, 'success');
      return dispatch(resetPasswordEmailSent());
    });
  };
}
export function logout() {
  localStorage.clear();
  browserHistory.replace('/dashboard');
  return {
    type: LOGOUT_SUCCESS
  };
}
function updatingUser() {
  return {
    type: UPDATING_USER
  };
}
function updateUserData(data) {
  return {
    type: RECEIVED_USER_DATA,
    data
  };
}
export function updateUser(payload, userId) {
  return dispatch => {
    dispatch(updatingUser());
    return auth
      .updateUser(payload, userId)
      .then(resp => {
        return {
          email: resp.email,
          user_id: resp.user_id,
          user_metadata: resp.user_metadata
        };
      })
      .then(data => {
        // update locally now that updated in auth0
        const auth0_id = data.user_id;
        const email = data.user_metadata.userEmail;
        return localAxios.post(
          `users/${auth0_id}`,
          {
            email
          },
          {
            headers: {
              Authorization: 'Bearer ' + localStorage.getItem('id_token')
            }
          }
        );
      })
      .then(data => {
        dispatch(updateUserData(data));
      });
  };
}
export function isAuthenticated() {
  return auth.isAuthenticated();
}
export function sendTempId(id) {
  return {
    type: TEMP_USER_ID,
    id
  };
}

export function getUserInfo(quiz) {
  // this quiz name is used for the api endpoint when creating a temporary user
  // if(!quiz) {
  //   let msg = "Need a quiz name in order to determine API route";
  //   console.error(msg)
  //   throw new Error(msg)
  // }

  // used for when a user is part ways through a quiz and we need to reassign their answers
  let accessToken = auth.getAccessToken();
  return (dispatch, getState) => {
    // set this user to anonymous if no access token in state
    if (!accessToken) {
      return dispatch(
        loginSuccess({
          anonymous: true,
          quiz: quiz
        })
      );
    }
    // if there is an access token
    // get that info from auth0
    return new Promise((res, rej) => {
      auth.lock.getUserInfo(accessToken, (error, profile) => {
        if (error) {
          return rej(error);
        }
        return res(profile);
      });
    })
      .then(profile => {
        // load the extra metadata from auth0
        return auth.getUserMetadata(profile.sub).then(meta => {
          if (!meta) {
            return auth.updateUser({}, profile.sub).then(resp => {
              return {
                ...profile,
                email: resp.email,
                user_id: resp.user_id,
                user_metadata: resp.user_metadata
              };
            });
          }
          return {
            ...profile,
            user_metadata: meta,
            email: profile.email,
            user_id: profile.sub
          };
        });
      })
      .then(profile => {
        // if you give it a quiz
        if(typeof quiz === 'string') {
          // create user and reassign answers
          const tempId = localStorage.getItem('tempUser');
          // create a quiz user
          return localAxios
            .post(`${quiz}/createUser`, { auth0_id: profile.user_id, user_id: tempId })
            .then(res => {
              //comment get this back to the way it was
              dispatch(
                loginSuccess({
                  ...profile,
                  ...res.data,
                  quiz: quiz
                })
              );
              return {
                ...profile,
                ...res.data,
                quiz: quiz
              };
            })
            .then(data => {
              // reassign the responses
              const tempUser = localStorage.getItem('tempUser');
              const tempResponses = getState().tempResponses.tempResponse;
              const tempStimulusResponse = getState().tempStimulusResponse;
              var p = [];
              if (tempUser) {
                if (tempResponses) {
                  tempResponses.map(response => {
                    response.user_id = data.id;
                    return localAxios.post(`${quiz}/response`, response).then(res => res.data)
                  }).forEach(promise => {
                    return p.push(promise)
                  });
                }
                if (tempStimulusResponse) {
                  tempStimulusResponse.map(response => {
                    response.user_id = data.id;
                    return localAxios.post(`${quiz}/stimulusResponse`, response).then(res => res.data)
                  }).forEach(promise => {
                    p.push(promise);
                  });
                }
              }
              return Promise.all(p).then(() => {
                return tempUser;
              });
            })
            .then(tempUser => {
              // then delete the original responses
              if (tempUser) {
                return localAxios.post(`${quiz}/deleteUser`, { id: tempUser }).then(data => {
                  dispatch(sendTempResponse([]));
                  dispatch(sendTempStimulusResponse([]));
                  localStorage.removeItem('tempUser');
                });
              }
            });
        } else {
          return dispatch(loginSuccess(profile));
        }
        // now that have a full auth0 user
      })
      .catch(error => {
        return dispatch(loginError(error));
      });
  };
}
export function generateAnonymousUser(quiz) {
  if(!quiz) {
    let msg = "Need a quiz name in order to determine API route";
    console.error(msg)
    throw new Error(msg)
  }
  return dispatch => {
    return localAxios.post(`${quiz}/createUser`).then(({ data }) => {
      localStorage.setItem('tempUser', data.id);
      return dispatch(loginSuccess({ ...data, quiz }));
    });
  };
}
export function updateUserWithAuth0Id(auth0_id, user_id,quiz) {
  if(!quiz) {
    let msg = "Need a quiz name in order to determine API route";
    console.error(msg)
    throw new Error(msg)
  }
  return dispatch => {
    return localAxios.put(`${quiz}/users/${auth0_id}`, { user_id: user_id }).then(resp => {
      return dispatch(loginSuccess(resp.data));
    });
  };
}
function submitUserInfoBegin() {
  return {
    type: SUBMIT_USER_INFO_BEGIN
  };
}
function submitUserInfoSuccess(data) {
  return {
    type: SUBMIT_USER_INFO_SUCCESS,
    data
  };
}
export function getUserId() {
  return dispatch => {
    dispatch(submitUserInfoBegin());
    return local
      .get('initialQuestions')
      .then(resp => {
        if (resp.error) {
          return dispatch(error(resp.error));
        }
        return dispatch(sendUserId(resp.data.user.id));
      })
      .catch(err => {
        throw err;
      });
  };
}
export function submitUserInfo(info) {
  return (dispatch, getState) => {
    const state = getState();
    const userId = state.userInfo.id;
    const payload = { ...info, id: userId };
    dispatch(submitUserInfoBegin());
    local
      .put(`users/${userId}`, payload, {
        headers: { 'Content-Type': 'application/json' }
      })
      .then(resp => resp.data)
      .then(data => {
        return dispatch(submitUserInfoSuccess(data));
      });
  };
}

function submitCommentsBegin() {
  return { type: SUBMIT_COMMENTS_BEGIN };
}

function submitCommentsSuccess(data) {
  return { type: SUBMIT_COMMENTS_SUCCESS, data };
}
export function submitComments(comments) {
  return (dispatch, getState) => {
    const state = getState();
    if (state.userInfo.id) {
      const userId = state.userInfo.id;
      let payload;
      if (comments.nativeLanguages) {
        payload = {
          userId,
          ...comments
        };
      }

      dispatch(submitCommentsBegin());
      local
        .post('/comments', payload, {
          headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.data)
        .then(data => {
          const nativeLanguages = new Set();
          const primaryLanguages = new Set();
          for (let i = 0; i < data.userLanguages.length; i++) {
            const lang = data.userLanguages[i];
            if (lang.primary) {
              primaryLanguages.add(lang.language.name);
            }
            if (lang.native) {
              nativeLanguages.add(lang.language.name);
            }
          }
          const obj = {
            nativeLanguages: [...nativeLanguages],
            primaryLanguages: [...primaryLanguages]
          };
          return dispatch(submitCommentsSuccess(obj));
        })
        .then(() => {
          browserHistory.push(`/results/user/${userId}`);
        });
    } else {
      throw new Error(
        'there is no user id to attach these comments and demographic data too'
      );
    }
  };
}
