---
description: Start here to build install Pushkin and its dependencies on Ubuntu Linux.
---

# Ubuntu Linux

These instructions were created using Ubuntu 18.04 and the apt package manager. They should generalize to other Linux distributions and package managers, however.

## Skip to section

* [Install curl](ubuntu-install.md#install-curl)
* [Install Node.js](ubuntu-install.md#install-nodejs)
* [Install and configure Yarn](ubuntu-install.md#install-and-configure-yarn)
* [Install Yalc](ubuntu-install.md#install-yalc)
* [Install pushkin-cli](ubuntu-install.md#install-pushkin-cli)
* [Install and configure Docker Engine and Docker Compose](ubuntu-install.md#install-and-configure-docker-engine-and-docker-compose)
* [Next steps](ubuntu-install.md#next-steps)

### Install curl

First, ensure that you have curl installed, as this will be necessary to download Node.js. If it isn't installed, you can install it using the following commands:

```bash
$ sudo apt update
$ sudo apt install curl
```

![](../../.gitbook/assets/ubuntu1%20%281%29.gif)

### Install Node.js

To install Node.js, first run the following command to install nvm:

```bash
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```

Then use nvm to install Node.js:

```bash
$ nvm install 20.2.0
```

In case the preferred version of Node.js is changed, use the following commands to update:

```bash
$ nvm install <node_version>
$ nvm use <node_version>
```

![](../../.gitbook/assets/ubuntu2%20%281%29.gif)

### Install and configure Yarn

You will next want to install the Yarn package manager. Official instructions \(copied below for convenience\) are available [here](https://classic.yarnpkg.com/en/docs/install/#debian-stable).

Use npm, which comes bundled with Node.js that you just installed:
```bash
$ npm install --global yarn
```

Then check that Yarn is installed by running:
```bash
yarn --version
```

![](../../.gitbook/assets/ubuntu3%20%281%29.gif)

To allow Yarn to install pushkin-cli globally, run the following steps, based on [this Stack Overflow solution](https://stackoverflow.com/questions/40317578/yarn-global-command-not-working/53879534#53879534).

Run the following:

```bash
$ yarn config set prefix ~/.yarn
$ echo -e '\nexport PATH="$PATH:`yarn global bin`"\n' >> ~/.bashrc
$ source ~/.bashrc
```

![](../../.gitbook/assets/ubuntu4%20%281%29.gif)

### Install Yalc

Install Yalc globally.

```bash
$ yarn global add yalc
```

![](https://github.com/pushkin-consortium/pushkin/tree/ed8e59c86dfdd71e3662583683010b92cb95b39d/docs-gitbook/.gitbook/assets/ubuntu13.gif)

### Install pushkin-cli

Next, install the pushkin-cli package globally.

```bash
$ yarn global add pushkin-cli
```

![](../../.gitbook/assets/ubuntu5%20%281%29.gif)

Confirm that pushkin-cli is installed by running:

```bash
$ pushkin --help
```

You should get a list of commands with some documentation for each.

![](../../.gitbook/assets/ubuntu6%20%281%29.gif)

Confirm that you have version `2.0.0` or later by running:

```bash
$ pushkin --version
```

and reading the output.

### Install and configure Docker Engine and Docker Compose

Next, install Docker Engine [using these instructions](https://docs.docker.com/engine/install/ubuntu/) \(copied below for convenience\).

```bash
$ sudo apt-get update
$ sudo apt-get install ca-certificates curl gnupg
```

![](../../.gitbook/assets/ubuntu7%20%281%29.gif)

Add Docker’s official GPG key:

```bash
$ sudo install -m 0755 -d /etc/apt/keyrings
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
$ sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Use the following command to set up the repository:

```bash
$ echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

![](../../.gitbook/assets/ubuntu8%20%281%29.gif)

Next, update the apt package index:

```bash
$ sudo apt-get update
```

Install Docker Engine, containerd, and Docker Compose:

```bash
$ sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

![](../../.gitbook/assets/ubuntu9%20%281%29.gif)

Check that Docker Engine is installed correctly by running:

```bash
$ sudo docker run hello-world
```

If Docker Engine and Docker Compose are installed correctly, this should generate some output, including:

```bash
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

![](../../.gitbook/assets/ubuntu10%20%281%29.gif)

Next, follow [these post-installation instructions](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user) \(copied below for convenience\) to manage Docker as a non-root user. \(You can ignore the rest of the post-installation instructions.\)

```bash
$ sudo groupadd docker
$ sudo usermod -aG docker $USER
$ newgrp docker 
$ docker run hello-world
```

![](../../.gitbook/assets/ubuntu11%20%281%29.gif)

### Next steps

Great! You're all done. Head over [here](../quickstart/) to build a basic Pushkin site and experiment.

