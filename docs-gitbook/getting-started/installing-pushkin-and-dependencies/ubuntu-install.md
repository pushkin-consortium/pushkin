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
* [Install and configure Docker Engine](ubuntu-install.md#install-and-configure-docker-engine)
* [Install and configure Docker Compose](ubuntu-install.md#install-and-configure-docker-compose)
* [Next steps](ubuntu-install.md#next-steps)

### Install curl

First, ensure that you have curl installed, as this will be necessary to download Node.js. If it isn't installed, you can install it using the following commands:

```bash
$ sudo apt update
$ sudo apt install curl
```

![](../../.gitbook/assets/ubuntu1%20%281%29.gif)

### Install Node.js

To install the latest version of Node.js , follow [these instructions at NodeSource](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions). They are copied below for your convenience, but you should follow the link in case their instructions have changed.

```bash
$ curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
$ sudo apt install -y nodejs
```

![](../../.gitbook/assets/ubuntu2%20%281%29.gif)

### Install and configure Yarn

You will next want to install the Yarn package manager. Official instructions \(copied below for convenience\) are available [here](https://classic.yarnpkg.com/en/docs/install/#debian-stable).

```bash
$ curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
$ echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
$ sudo apt update && sudo apt install yarn
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

### Install and configure Docker Engine

Next, install Docker Engine [using these instructions](https://docs.docker.com/engine/install/ubuntu/) \(copied below for convenience\).

```bash
$ sudo apt update
$ sudo apt install apt-transport-https ca-certificates curl gnupg-agent software-properties-common
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

![](../../.gitbook/assets/ubuntu7%20%281%29.gif)

Verify the fingerprint of the key by running this command:

```bash
$ sudo apt-key fingerprint 0EBFCD88
```

Your output should look like this:

```bash
pub   rsa4096 2017-02-22 [SCEA]
      9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88
uid           [ unknown] Docker Release (CE deb) <docker@docker.com>
sub   rsa4096 2017-02-22 [S]
```

![](../../.gitbook/assets/ubuntu8%20%281%29.gif)

Next, add the repository and install Docker Engine.

```bash
$ sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
$ sudo apt update
$ sudo apt install docker-ce docker-ce-cli containerd.io
```

![](../../.gitbook/assets/ubuntu9%20%281%29.gif)

Check that Docker Engine is installed correctly by running:

```bash
$ sudo docker run hello-world
```

If Docker Engine installed correctly, this should generate some output, including:

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

### Install and configure Docker Compose

Follow [these instructions](https://docs.docker.com/compose/install/#install-compose-on-linux-systems) \(copied below for convenience\) to install Docker Compose.

```bash
$ sudo curl -L "https://github.com/docker/compose/releases/download/1.26.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$ sudo chmod +x /usr/local/bin/docker-compose
$ docker-compose --version
```

![](../../.gitbook/assets/ubuntu12%20%281%29.gif)

### Next steps

Great! You're all done. Head over [here](../quickstart/) to build a basic Pushkin site and experiment.

