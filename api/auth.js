const request = require('request-promise');

const express = require('express');
const channelName = 'users_rpc_worker'

require('dotenv').config();

const getToken = () => {
  return request({
    uri: process.env.OAUTH_URL,
    method: 'POST',
    headers: {
    },
    json: true,
    body: {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: process.env.AUDIENCE
    }
  }).then(body => body.access_token)
}
module.exports = (rpc, conn) => {
  const router = new express.Router();
  router.get('/getAuth0User/:id', (req, res, next) => {
    // request token
    return getToken().then(access_token => {
      const options = {
        url: `https://${process.env.DOMAIN}/api/v2/users/${req.params.id}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + access_token
        },
        json: true
      };
      return request(options)
    })
      .then(data => {
        return res.json(data.user_metadata);
      }).catch(next)

  });
  const checkJWT = require('./authMiddleware').verify;
  router.post(`/users/:auth0_id`, checkJWT, (req, res, next) => {
    // check if this auth0_id belongs to the user
    // updates the users email in database if needed, or creates a new user if that auth0_id isnt found
    if (req.user.sub == req.params.auth0_id) {
      const params = {
        auth0_id: req.params.auth0_id,
        email: req.body.email
      }
      var rpcInput = {
        method: 'queryUserEmail',
        params: [[['where', 'auth0_id', '=', req.params.auth0_id]]]
      };
      return rpc(conn, channelName, rpcInput)
        .then(user => {
          if (user.err) {
            return next(user);
          } else {
            return user
          }
        }).then(users => {
          const user = users[0]
          if (user) {
            var rpcInput = {
              method: 'updateUserEmail',
              params: [{ auth0_id: req.params.auth0_id }, {
                email: req.body.email
              }]
            };
            return rpc(conn, channelName, rpcInput)
          } else {
            const params = {
              auth0_id: req.params.auth0_id,
              email: req.body.email
            }
            var rpcInput = {
              method: 'createUserEmail',
              params: [params]
            };
            return rpc(conn, channelName, rpcInput)

          }
        }).then(data => res.json(data))

    } else {
      res.status(401).json({ message: "Not authorized" })
    }
  })
  return router;
};
