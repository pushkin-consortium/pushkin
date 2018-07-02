const request = require("request-promise");

require("dotenv").config();

const getToken = () => {
  return request({
    uri: process.env.OAUTH_URL,
    method: "POST",
    headers: {},
    json: true,
    body: {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: process.env.AUDIENCE
    }
  }).then(body => body.access_token);
};
module.exports.fetchUserName = auth0_id => {
  return getToken().then(access_token => {
    const options = {
      // url: `https://gww.auth0.com/api/v2/users/${req.params.id}`,
      url: `${process.env.ISSUER}api/v2/users/${auth0_id}`,
      method: "GET",
      headers: {
        Authorization: "Bearer " + access_token
      },
      json: true
    };
    return request(options);
  });
};
