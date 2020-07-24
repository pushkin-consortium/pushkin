---
description: Start here to build install Pushkin and its dependencies on Windows 10.
---

# Windows 10

We are eventually hoping to be able to use the [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/) to deploy Pushkin on your local Windows computer. This setup is not currently working reliably, however, but when Microsoft releases a fix, we will update our documentation accordingly.

For now, we suggest that Windows users create a free-tier Amazon Web Services (AWS) EC2 instance, where you will be able to run a Ubuntu virtual machine and follow the Ubuntu tutorial instructions. We suggest accessing this AWS EC2 instance using the PuTTY SSH client, though in principle any SSH client for Windows should work.

## Skip to section

* [Create your AWS EC2 instance](windows-install.md#create-your-aws-ec2-instance)
* [Install and configure PuTTY](windows-install.md#install-and-configure-putty) 
* [Connect to your EC2 instance](windows-install.md#connect-to-your-ec2-instance)
* [Next steps](windows-install.md#next-steps)

### Create your AWS EC2 instance

### Install and configure PuTTY

### Connect to your EC2 instance

You can follow [this tutorial](https://www.freecodecamp.org/news/how-to-install-ubuntu-with-oracle-virtualbox/) to set up your Ubuntu virtual machine on Windows 10. We recommend using Ubuntu 18.04.

Once you have configured your virtual machine and installed Ubuntu, open the Ubuntu Terminal by pressing CTRL and typing 'terminal' and ENTER or by using the keyboard shortcut CTRL+ALT+T. Once you have opened the terminal, run the following commands to update your Ubuntu packages. This \(and other commands with `sudo` in front of them\) will prompt you to give the Ubuntu password you set up when you installed it. It will also prompt you to respond with `y` and press ENTER to confirm that you would like to install or update any software packages.

```bash
$ sudo apt update
$ sudo apt upgrade
```

\(For more on package management with apt, you can see the documentation [here](https://ubuntu.com/server/docs/package-management). To learn more about the basics of the Linux command line, you can follow [this tutorial](https://ubuntu.com/tutorials/command-line-for-beginners#1-overview).\)

### Next steps

From here, you can follow the instructions for [Ubuntu Linux](ubuntu-install.md) to finish the installation.
