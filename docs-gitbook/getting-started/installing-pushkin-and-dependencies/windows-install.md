---
description: Start here to build install Pushkin and its dependencies on Windows 10, then continue to Ubuntu Linux to finish installation.
---

# Windows 10

To install Pushkin, Windows users will have to install the Windows Subsystem for Linux (WSL) 2. Note that this process will require restarting your computer multiple times. [This tutorial](https://docs.microsoft.com/en-us/windows/wsl/install-win10) explains how to configure WSL 2 and install a Linux distribution from the Microsoft Store. We recommend using Ubuntu 20.04. 

Pushkin requires using WSL 2. To check which version of WSL you are using, run the following command in Windows Powershell:

```bash
$ wsl --list --verbose
```

![](../../.gitbook/assets/wsl1.gif)

This will give you a list of your installed Linux distributions and what version of WSL they are using. If your distribution is using WSL 1, run:

```bash
$ wsl --set-version <distribution name> 2
```

The distribution name should be the name given in the previous list for your Linux distribution.

As the tutorial details, you will need Windows 10 version 2004 to be able to use WSL 2. If you follow the instructions in the tutorial and cannot update to version 2004, [these steps](https://www.bleepingcomputer.com/news/microsoft/windows-10-2004-update-not-offered-heres-how-to-get-it-now/) may be able to help.

After you have enabled WSL 2 and installed Ubuntu, you will probably also want to enable copy and paste in the terminal by right-clicking on the terminal window, selecting *Properties* and following [these instructions](https://devblogs.microsoft.com/commandline/copy-and-paste-arrives-for-linuxwsl-consoles/).

![](../../.gitbook/assets/copyPasteScreenshot.jpg)

Next, run the following commands in the Ubuntu terminal to update your Ubuntu packages. This (and other commands with `sudo` in front of them) will prompt you to give the Ubuntu password you set up when you installed it. It will also prompt you to respond with `y` and press ENTER to confirm that you would like to install or update software. 

```bash
$ sudo apt update
$ sudo apt upgrade
```

![](../../.gitbook/assets/wsl2.gif)

(For more on package management with apt, you can see the documentation [here](https://ubuntu.com/server/docs/package-management). To learn more about the basics of the Linux command line, you can follow [this tutorial](https://ubuntu.com/tutorials/command-line-for-beginners#1-overview).)

## Next

From here, you can follow the instructions for [Ubuntu Linux](ubuntu-install.md) to finish the installation.
