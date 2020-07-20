---
description: Start here to build a basic Pushkin site and experiment.
---

# Quickstart

## Skip to section

* [Installing Pushkin and dependencies](quickstart.md#installing-pushkin-and-dependencies)
* [Creating a basic new Pushkin site](quickstart.md#creating-basic-new-pushkin-site)
* [Making an experiment](quickstart.md#making-an-experiment)
* [Setting up logins](quickstart.md#setting-up-logins)
* [Local testing](quickstart.md#local-testing)
* [Updating](quickstart.md#updating)
* [Starting over](quickstart.md#starting-over)

### Installing Pushkin and dependencies

#### macOS

If you don’t have [Homebrew](https://brew.sh/), install it. Then run the following:

```bash
$ brew install Node
```

Install the pushkin-cli package globally.

```bash
$ npm install -g pushkin-cli
```

Confirm that pushkin-cli is installed by running

```bash
$ pushkin --help
```

You should get a list of commands with some documentation for each. We’ll be going through the critical ones below.

Next, install [Docker](https://docs.docker.com/install/).

#### Windows 10

This setup depends on the Windows Subsystem for Linux \(WSL\) 2.[This tutorial](https://docs.microsoft.com/en-us/windows/wsl/install-win10) explains how to configure WSL 2 and install a Linux distribution from the Microsoft Store. We recommend using Ubuntu 18.04. Make sure you [set your distribution to WSL 2](https://docs.microsoft.com/en-us/windows/wsl/install-win10#set-your-distribution-version-to-wsl-1-or-wsl-2), or this tutorial will not work.

As the tutorial details, you will need Windows 10 version 2004 to be able to use WSL 2. If you follow the instructions in the tutorial and cannot update to version 2004, [these steps](https://www.bleepingcomputer.com/news/microsoft/windows-10-2004-update-not-offered-heres-how-to-get-it-now/) may be able to help.

After you have enabled WSL 2 and installed Ubuntu, you will probably also want to enable copy and paste in the terminal by right-clicking on the terminal window, selecting _Properties_ and following [these instructions](https://devblogs.microsoft.com/commandline/copy-and-paste-arrives-for-linuxwsl-consoles/).

Next, run the following commands in the Ubuntu terminal to update your Ubuntu packages. This \(and other commands with `sudo` in front of them\) will prompt you to give the Ubuntu password you set up when you installed it. It will also prompt you to respond with `y` and press ENTER to confirm that you would like to install or update software.

```bash
$ sudo apt update
$ sudo apt upgrade
```

\(For more on package management with apt, you can see the documentation [here](https://ubuntu.com/server/docs/package-management). To learn more about the basics of the Linux command line, you can follow [this tutorial](https://ubuntu.com/tutorials/command-line-for-beginners#1-overview).\)

To be able to install the latest version of node, you will first have to uninstall gpg and install gnupg1 instead, as detailed [here](https://stackoverflow.com/questions/46673717/gpg-cant-connect-to-the-agent-ipc-connect-call-failed). The commands are copied below for convenience:

```bash
$ sudo apt remove gpg
$ sudo apt install gnupg1
```

From here, you can follow the instructions below for Ubuntu Linux to finish the installation.

#### Ubuntu Linux

These instructions were created using Ubuntu 18.04 and the apt package manager but should generalize to other Linux distributions and package managers.

First, ensure that you have curl installed, as this will be necessary to download Node. If it is not installed, it can be installed using the following commands:

```bash
$ sudo apt update
$ sudo apt install curl
```

To install the latest version of Node.js , follow [these instructions at NodeSource](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions). The instructions are copied below for convenience, but it is best to follow the link in case their instructions change in the future.

```bash
$ curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
$ sudo apt install -y nodejs
```

Next, install the pushkin-cli package globally.

```bash
$ npm install -g pushkin-cli
```

If you get the error `Missing write access to /usr/lib/node_modules`, follow [the instructions here](https://stackoverflow.com/a/41395398) \(copied below for convenience\) to create a `npm` directory that does not require root access.

```bash
$ mkdir ~/.npm-global
$ echo -e "export NPM_CONFIG_PREFIX=~/.npm-global\nexport PATH=\$PATH:~/.npm-global/bin" >> ~/.bashrc
```

\(Note: If you are using the Windows Subsystem for Linux, you will need to reboot your computer before continuing.\)

Now re-run the previous `npm install` command to install the pushkin-cli package.

Confirm that pushkin-cli is installed by running

```bash
$ pushkin --help
```

You should get a list of commands with some documentation for each. We'll be going through the critical ones below.

Next, install Docker Engine [using these instructions](https://docs.docker.com/engine/install/ubuntu/) and then follow [these post-installation instructions](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user) to manage Docker as a non-root user. \(The rest of the post-installation instructions can be ignored.\)

Finally, follow [these instructions](https://docs.docker.com/compose/install/#install-compose-on-linux-systems) to install Docker Compose.

### Creating a basic new Pushkin site

Make sure Docker is running. On macOS, a Docker icon should show up in the menu bar at the top of the screen. On Ubuntu and WSL, you can run the command `docker info` or `sudo systemctl is-active docker` to check whether it is running. If it is not, you can run `dockerd` to start it.

Then, if it is not open already, open a terminal window. Then you can create an empty directory called `pushkin_quickstart` \(although in principle it could have any name\) and move to this directory using the following commands:

```bash
$ mkdir pushkin_quickstart
$ cd pushkin_quickstart/
```

\(For more on basic terminal commands, you can check out [this blog post](https://medium.com/@grace.m.nolan/terminal-for-beginners-e492ba10902a).\)

You will be installing your first pushkin site the in the directory you just created.

```bash
$ pushkin install site
```

You will be asked to select a site template to use. Choose ‘default’.

This sets up a skeleton website in the current folder and sets up a development database. Once that finishes, you should have a directory tree that looks something like this:

```text
├── experiments
├── pushkin
   ├── api
   ├── docker-compose.dev.yml
   ├── front-end
   └── util
└── pushkin.yaml
```

Most of the stuff in the pushkin folder won’t need to be edited at all, with the exception of the website \(in the front-end folder\).

### Making an Experiment

To create a new experiment from the boilerplate template Pushkin provides, run

```bash
$ pushkin install experiment
```

Choose a ‘basic’ experiment. When prompted, name your experiment ‘Vocab’. Repeat the process to add ‘basic’ experiments called ‘Mind’ and ‘WhichEnglish’ as well.

This will create a new folder in the experiments directory like

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

Each folder in here contains something unique to each experiment. There’s also a configuration file that allows us to define a full name for the experiment and specify what database to use, among other things.

Keeping all the files for an experiment within the same root folder is convenient for development, but not for actually deploying the website. To redistribute the experiment files to the right places, run:

```bash
$ pushkin prep
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

Note that these URLs are used for development. When you launch the live version of your website, you will need to add your public URLs. Repeat the instructions above, replacing [http://localhost](http://localhost) with [https://YOUR-WEBSITE](https://YOUR-WEBSITE). For instance, for gameswithwords, the urls are `https://gameswithwords.org` and `https://gameswithwords/callback`.

1. On the settings page, you will see a `Domain` \(something like `gameswithwords.auth0.com`\) and a `Client ID`. Edit `config.js` to match:

```javascript
authDomain: '<YOUR_AUTH0_DOMAIN>',
authClientID: '<YOUR_AUTH0_CLIENT_ID>',
```

### Local testing

Now, let’s look at your website! Make sure Docker is running, and then type

```bash
$ pushkin start;
```

Now browse to `http://localhost` to see the stub website.

When you are done looking at your website, stop it by running:

```bash
$ pushkin stop;
```

If you don’t do that, the web server will keep running in Docker until you quit Docker or restart.

### Updating

Every time you update code or add an experiment, you’ll need to run pushkin prep again:

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml start test_db
$ pushkin start
```

### Starting over

The great thing about Docker is that it saves your work. \(Read up on Docker to see what I mean.\) The bad thing is that it saves your work. Simply editing your code locally may not change what Docker thinks the code is. So if you are updating something but it’s not showing up in your website or if you are getting error messages from Docker … ideally, you should read up on Docker. However, as a fail-safe, run pushkin kill to delete all your pushkin-specific code in Docker. Then just run pushkin prep again. This will take a while, but should address any Docker-specific problems. If you really need a fresh Docker install, run pushkin armageddon, which will completely clean Docker.

