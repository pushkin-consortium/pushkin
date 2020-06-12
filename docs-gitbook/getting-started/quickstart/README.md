# Quickstart

Hello.

{% include "./Local-testing.md" %}




### Making an Experiment

To create a new experiment from the boilerplate template Pushkin provides, run

```bash
$ pushkin experiment basic myexp
$ pushkin init myexp
```

replacing “myexp” with a short name of your experiment. This will create a new folder in the experiments directory like

```text
└── myexp
    ├── api controllers
    ├── config.yaml
    ├── migrations
    ├── seeds
    ├── web page
    └── worker
```

Each folder in here contains something unique to this experiment. There’s also a configuration file that allows us to define a full name for the experiment and specify what database to use, among other things.

Keeping all the files for an experiment within the same root folder is convenient for development, but not for actually deploying the website. To redistribute the experiment files to the right places, run:

```bash
$ pushkin prep
```

### Setting up a local database

For now, let’s use the test database that is built by `pushkin init site`. We need to populate it with stimuli for our experiment\(s\):

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml start test_db
$ pushkin setupdb
$ docker-compose -f pushkin/docker-compose.dev.yml stop test_db
```

### Setting up logins

In `config.js`, located at ./pushkin/front-end/src, set `useAuth` to `true` or `false` depending on whether you want to have a login system or not. Note that you cannot use a forum without a login system:

```javascript
useForum: false,
useAuth: false,
//Note that the forum won't work without authentication
```

By default, Pushkin authenticates users using [Auth0](http://auth0.com/). This provides many features and better security than could be managed otherwise. It is free for open source projects \(contact [sales@auth0.com](mailto:sales%40auth0.com)\); otherwise it can be fairly pricey if you are hoping for a lot of users. To set up Auth0, use the following directions. \(Note that at some point, Auth0 will change up their website and these instructions may get out of date.\)

1. Go to auth0.com and create an Auth0 account.
2. Go to the _Applications_ section of the Auth0 dashboard and click _Create Application_.
3. Give your application and a name. Select _Single Page Web App_ as your application type. Click _Create_.
4. Choose the _Settings_ tab. In _Allowed Callback URLs_, add `http://localhost/`. In _Allowed Logout URLs_, add `http://localhost`. In _Allowed Web Origins_, also add `http://localhost`. Click the _Save Changes_ button.

Note that these URLs are used for development. When you launch the live verrsion of your website, you will need to add your public URLs. Repeat the instructions above, replacing _http://localhost_ with _https://YOUR-WEBSITE_. For instance, for gameswithwords, the urls are `https://gameswithwords.org` and `https://gameswithwords/callback`.

1. On the setings page, you will see a `Domain` \(something like `gameswithwords.auth0.com`\) and a `Client ID`. Edit `config.js` to match:

```javascript
authDomain: '<YOUR_AUTH0_DOMAIN>',
authClientID: '<YOUR_AUTH0_CLIENT_ID>',
```

### Local testing

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;
```

Now browse to `http://localhost` to see the stub website.

### Updating

If you make updates to your website, here is how to re-launch a local test version:

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml stop
$ pushkin prep
$ docker-compose -f pushkin/docker-compose.dev.yml start test_db
$ pushkin setupdb
$ docker-compose -f pushkin/docker-compose.dev.yml stop test_db
$ docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;
```

