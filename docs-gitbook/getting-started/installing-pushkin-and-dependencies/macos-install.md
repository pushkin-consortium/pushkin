---
description: Start here to build install Pushkin and its dependencies on macOS.
---

# macOS

## Skip to section

* [Install Homebrew](macos-install.md#install-homebrew)
* [Install Yarn](macos-install.md#install-yarn)
* [Install pushkin-cli](macos-install.md#install-pushkin-cli)
* [Install Docker](macos-install.md#install-docker)
* [Next steps](macos-install.md#next-steps)

### Install Homebrew

If you don’t have [Homebrew](https://brew.sh/), install it. If you do not have Xcode installed yet, this installation will prompt you to install it as well.

![](../../.gitbook/assets/ezgif.com-video-to-gif%20%281%29%20%281%29.gif)

Note that Homebrew requires a 64-bit Intel CPU, macOS High Sierra /(10.13/) or higher, Command Line Tools /(CLT/) for Xcode, and a Bourne-compatible shell for installation like bash or zsh.

### Install Node

If you don't have an installation of Node yet (you'd know if you did), you should install it:

```bash
 brew install node
```

### Install Yarn

Then run the following to get Yarn, which will let you download Pushkin:

```bash
 brew install yarn
```

![](../../.gitbook/assets/ezgif.com-video-to-gif-2-%20%281%29%20%281%29.gif)

### Install Yalc

Install Yalc globally.

```bash
 yarn global add yalc
```

![](../../.gitbook/assets/ezgif.com-video-to-gif-6-%20%281%29.gif)

### Install pushkin-cli

Install pushkin-cli package globally.

```bash
 yarn global add pushkin-cli
```

![](../../.gitbook/assets/ezgif.com-video-to-gif-3-%20%281%29%20%281%29.gif)

Confirm that pushkin-cli is installed by running:

```bash
 pushkin --help
```

You should get a list of commands with some documentation for each.

![](../../.gitbook/assets/ezgif.com-video-to-gif-1-%20%281%29%20%281%29.gif)

Confirm that you have version `2.0.0` or later by running:

```bash
 pushkin --version
```

and reading the output.

### Install Docker

Next, install [Docker](https://docs.docker.com/install/).

![](../../.gitbook/assets/ezgif.com-video-to-gif-5-%20%281%29%20%281%29.gif)

### Next steps

Great! You're all done. Head over [here](../quickstart/) to build a basic Pushkin site and experiment.

