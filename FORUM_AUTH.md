# Forum and Auth System

## Auth

In order to add authentication to your pushkin installation that allows for social media logins, you need to create an account on [Auth0](http://auth0.com/)

Auth0 is a Authentication as a Service provider that does all the heavy lifting for us, it can send account confirmation emails, account verification emails, password resets etc etc. We don't have to do any of that heavy lifting.

The starting setup can be a little intense however. All your users will live on Auth0 but you need to create multiple *clients* that can access and create users via auth0.
1 client is for the front end application, another is for server side access.

On the client side, a user can see their own information, edit their information, delete account, logout etc. However, they cannot edit another persons information

On the server side, (since we are in control) we can see *all* information about *all* users, modify that information, and do whatever we want with it.



- On the Auth0 site you want to create 2 new clients, a Single Page App (SPA) Client, and a server/CLI project client.
  - SPA
    - add an allowed callback url as http://localhost:8000/loading
    - take not of the clientId
  - Server Side App
    - take note of the ClientID
    - also write down the ClientSecret

- Then under APIs, you want to turn on the management API, and enable access from the server/cli client you created before

- Under extensions on the left panel, add an application extension, "Authorization", this will allow for groups (admins, regular users etc)

Thats it for setup on the Auth0 side, now just replace credentials in 2 specific places.

- `core/auth0-variables.js` in the `front-end` folder
  ```js
  export const AUTH_CONFIG = {
    domain: $YOUR_DOMAIN
    clientId: $SPA_CLIENT_ID
    callbackUrl: 'http://localhost:8000/loading',
    audience: 'https://$YOURDOMAIN/api/v2/'
  };
  ```
Where `$YOUR_DOMAIN=mysite.auth0.com` and the client id is what was annotated earlier

- the `.env` file in the `api` folder. If it is not there, create it.

It should have the following format

```bash
JWKS_URI=https://$YOUR_DOMAIN/.well-known/jwks.json
AUDIENCE=https://$YOUR_DOMAIN/api/v2/
ISSUER=https://$YOUR_DOMAIN/
OAUTH_URL=https://$YOUR_DOMAIN/oauth/token
PORT=3000
CLIENT_SECRET=$CLIENT_SECRET
CLIENT_ID=$CLIENT_ID
DOMAIN=$YOUR_DOMAIN
```

Replace the domain, and the client secret and ID.

This should get you setup, just make sure `api/forum/config.js` and `front-end/config.js` has both `forum` and `auth` set to `true`
