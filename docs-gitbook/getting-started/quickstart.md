---
description: Start here to build a basic Pushkin site and experiment.
---

# Quickstart

## Skip to section

* [Creating a basic new Pushkin site](quickstart.md#creating-basic-new-pushkin-site)
* [Making an experiment](quickstart.md#making-an-experiment)
* [Setting up logins](quickstart.md#setting-up-logins)
* [Local testing](quickstart.md#local-testing)
* [Updating](quickstart.md#updating)
* [Starting over](quickstart.md#starting-over)

**If you haven't installed pushkin-cli and its dependencies, start** [**here**](installing-pushkin-and-dependencies/) **first.**

### Creating a basic new Pushkin site

Make sure Docker is running by running the command `docker info`; if it isn't, you can run `dockerd` or `sudo dockerd` to start it.

Open a terminal window. Create an empty directory \(e.g., `pushkin_quickstart`\) and enter this directory using the following commands:

```bash
$ mkdir pushkin_quickstart
$ cd pushkin_quickstart/
```

\(For more on basic terminal commands, you can check out [this blog post](https://medium.com/@grace.m.nolan/terminal-for-beginners-e492ba10902a).\)

Install your first pushkin site the in the directory you just created:

```bash
$ pushkin install site
```

You will be asked to select a site template to use. Choose *default*, then choose the recommended version (e.g., *v1.1.0*)

(See example output for this command [here](sample_output/pushkin-install-site.md).)

This sets up a skeleton website in the current folder and a development database. Once the command finishes, you should have a directory tree like this:

```text
├── experiments
├── pushkin
   ├── api
   ├── docker-compose.dev.yml
   ├── front-end
   └── util
└── pushkin.yaml
```

The files in the `pushkin` folder won’t need to be edited at all except those in the `front-end` folder.

### Making an experiment

To create a new experiment from the boilerplate template Pushkin provides, run

```bash
$ pushkin install experiment
```

Choose a *basic* experiment. When prompted, name your experiment `vocab` and choose the recommended version (e.g., *v3.0.0*). Repeat the process to add *basic* experiments called `mind` and `whichenglish` as well.

(See example output for this command [here](sample_output/pushkin-install-experiment.md).)

This will create a new folder in the experiments directory like this:

```text
└── vocab
    ├── api controllers
    ├── config.yaml
    ├── migrations
    ├── seeds
    ├── web page
    └── worker
└── mind
    ├── api controllers
    ├── config.yaml
    ├── migrations
    ├── seeds
    ├── web page
    └── worker
└── whichenglish
    ├── api controllers
    ├── config.yaml
    ├── migrations
    ├── seeds
    ├── web page
    └── worker
```

Each experiment has its own folder. Within this experiment-specific folder, there is also configuration file \(`config.yaml`\), which allows you to define a human-readable full name for the experiment \(e.g., _Which English?_ for `whichenglish`\), specify a database to use, and make other customizations.

Keeping all the files for an experiment within the same root folder is convenient for development, but not for actually deploying the website. To redistribute the experiment files to the right places, run:

```bash
$ pushkin prep
```
(See example output for this command [here](sample_output/pushkin-prep.md).)

### Setting up logins

In `config.js`, located at ./pushkin/front-end/src, set `useAuth` to `true` or `false` depending on whether you want to have a login system or not. Note that you cannot use a forum without a login system:

```javascript
useForum: false,
useAuth: false,
```

By default, Pushkin authenticates users using [Auth0](https://auth0.com/). This provides more features and better security than could be managed otherwise. It is free for open source projects \(contact [sales@auth0.com](mailto:sales%40auth0.com)\); otherwise it can be expensive if you are hoping for a lot of users. To set up Auth0, use the following directions. \(Note that at some point, Auth0 will change up their website and these instructions may get out of date.\)

1. Go to auth0.com and create an Auth0 account.
2. Go to the _Applications_ section of the Auth0 dashboard and click _Create Application_.
3. Give your application and a name. Select _Single Page Web App_ as your application type. Click _Create_.
4. Choose the _Settings_ tab. In _Allowed Callback URLs_, add `http://localhost/`. In _Allowed Logout URLs_, add `http://localhost`. In _Allowed Web Origins_, also add `http://localhost`. Click the _Save Changes_ button.

Note that these URLs are used for development. When you launch the live version of your website, you will need to add your public URLs. Repeat the instructions above, replacing [http://localhost](http://localhost) with [https://YOUR-WEBSITE](https://YOUR-WEBSITE). For instance, for gameswithwords, the URLs are `https://gameswithwords.org` and `https://gameswithwords/callback`.

If you are using an AWS EC2 instance, navigate to the IPv4 Public IP address of your instance instead of `http://localhost`. This can be found in the AWS EC2 console.

![](../.gitbook/assets/38.gif)

On the settings page, you will see a `Domain` \(something like `gameswithwords.auth0.com`\) and a `Client ID`. Edit `config.js` to match:

```javascript
authDomain: '<YOUR_AUTH0_DOMAIN>',
authClientID: '<YOUR_AUTH0_CLIENT_ID>',
```

Run `pushkin prep` again since you have made a change to your code.

### Local testing

Now, let’s look at your website! Make sure Docker is running by running the command `docker info`; if it is not, you can run `dockerd` or `sudo dockerd` to start it. Next, run:

```bash
$ pushkin start;
```
(See example output for this command [here](sample_output/pushkin-start.md).)

Now browse to `http://localhost` \(or your IPv4 Public IP address\) to see the stub website.

When you are done looking at your website, stop it by running:

```bash
$ pushkin stop;
```

If you don’t do that, the web server will keep running in Docker until you quit Docker or restart. When the command has finished running, it should output `done`.

### Updating

Every time you update code or add an experiment, you’ll need to run pushkin prep again:

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml start test_db
$ pushkin start
```

### Starting over

The great thing about Docker is that it saves your work. \(Read up on Docker to see what I mean.\) The bad thing is that it saves your work. Simply editing your code locally may not change what Docker thinks the code is. If you are updating something but it’s not showing up in your website or if you are getting error messages from Docker … ideally, you should read up on Docker. However, as a fail-safe, run `pushkin kill` to delete all your Pushkin-specific code in Docker. Then just run `pushkin prep` again. This will take a while but should address any Docker-specific problems. If you really need a fresh Docker install, run `pushkin armageddon`, which will completely clean Docker.
