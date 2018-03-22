// this whole file is deprecated
// import history from './history';
// import auth0 from 'auth0-js';
// import { AUTH_CONFIG } from './auth0-variables';
// import { browserHistory } from 'react-router';
// import local from '../actions/axiosConfigInitial';
// import Axios from 'axios';

// export default class Auth {
//   auth0 = new auth0.WebAuth({
//     domain: AUTH_CONFIG.domain,
//     clientID: AUTH_CONFIG.clientId,
//     redirectUri: AUTH_CONFIG.callbackUrl,
//     audience: AUTH_CONFIG.audience,
//     responseType: 'token id_token',
//     scope: 'openid email profile'
//   });

//   login = () => {
//     this.auth0.authorize();
//   };
//   handleAuthentication = () => {
//     return new Promise((res, rej) => {
//       this.auth0.parseHash((err, authResult) => {
//         if (err) {
//           return rej(err);
//         }
//         return res(authResult);
//       });
//     })
//       .then(authResult => {
//         if (authResult && authResult.accessToken && authResult.idToken) {
//           console.log(
//             'authResult',
//             authResult,
//             authResult.accessToken,
//             authResult.idToken
//           );
//           this.setSession(authResult);
//           // this.getProfile(authResult.accessToken);
//         }
//       })
//       .catch(err => {
//         browserHistory.replace('/error');
//         console.log(err);
//         alert(`Error: ${err.error}. Check the console for further details.`);
//       });
//   };

//   setSession = authResult => {
//     // Set the time that the access token will expire at
//     let expiresAt = JSON.stringify(
//       authResult.expiresIn * 1000 + new Date().getTime()
//     );
//     localStorage.setItem('access_token', authResult.accessToken);
//     localStorage.setItem('id_token', authResult.idToken);
//     localStorage.setItem('expires_at', expiresAt);

//     // navigate to the home route
//     browserHistory.replace('/dashboard');
//   };

//   logout = () => {
//     // Clear access token and ID token from local storage
//     // localStorage.removeItem('access_token');
//     // localStorage.removeItem('id_token');
//     // localStorage.removeItem('expires_at');
//     localStorage.clear();
//     // navigate to the home route
//     browserHistory.replace('/dashboard');
//     // remove profile from component
//     this.profile = null;
//   };
//   isAdmin = () => {
//     return this.getProfile();
//   };

//   isAuthenticated = () => {
//     // Check whether the current time is past the
//     // access token's expiry time
//     let expiresAt = JSON.parse(localStorage.getItem('expires_at'));
//     return new Date().getTime() < expiresAt;
//   };
//   getAccessToken = () => {
//     const accessToken = localStorage.getItem('access_token');
//     if (!accessToken) {
//       throw new Error('No access token found');
//     }
//     return accessToken;
//   };
//   getProfile = token => {
//     let accessToken = token || this.getAccessToken();
//     return new Promise((res, rej) => {
//       this.auth0.client.userInfo(accessToken, (err, profile) => {
//         if (profile) {
//           let userInfo;
//           return this.getUserMetadata(profile.sub).then(resp => {
//             userInfo = { ...profile, ...resp };
//             res(userInfo);
//           });
//         }
//         rej(err);
//       });
//     });
//   };
//   resetPassword = email => {
//     const payload = {
//       client_id: 'OIzT7gmLYcxbLZWGDz7LAsX6i2iCP2tc',
//       email: email,
//       connection: 'Username-Password-Authentication'
//     };
//     return local
//       .post(
//         `https://${AUTH_CONFIG.domain}/dbconnections/change_password`,
//         payload,
//         {
//           headers: { 'content-type': 'application/json' }
//         }
//       )
//       .then(resp => {
//         swal(resp.data, null, 'success');
//       });
//   };
//   getUserMetadata = userId => {
//     return local
//       .get(
//         `https://${
//           AUTH_CONFIG.domain
//         }/api/v2/users/${userId}?fields=user_metadata`,
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: 'Bearer ' + localStorage.getItem('id_token')
//           }
//         }
//       )
//       .then(resp => {
//         // localStorage.setItem('img', resp.data.user_metadata.imagePreviewUrl);
//         // localStorage.setItem('nickname', resp.data.user_metadata.nickname);
//         return resp.data.user_metadata;
//       });
//   };
//   updateUser = (payload, userId) => {
//     const data = {
//       user_metadata: { ...payload }
//     };
//     return local.patch(
//       `https://${AUTH_CONFIG.domain}/api/v2/users/${userId}`,
//       data,
//       {
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: 'Bearer ' + localStorage.getItem('id_token')
//         }
//       }
//     );
//   };
// }
