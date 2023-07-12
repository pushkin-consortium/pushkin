# AWS EC2 Instance

Previously we recommended that Windows users use Pushkin through an AWS EC2 instance due to bugs in WSL that made the setup unreliable. This issue seems to have been resolved, so we now recommend using WSL instead of an EC2 instance. Using an EC2 instance has a number of limitations, including:

- You cannot do true local testing via `localhost`, as the IPv4 public IP address must be used.
- In our experience, timeout errors are more common on EC2 instances.
- If multiple experiments are installed, the EC2 instances may run out of space with the default amount of storage.

However, users can choose to create a free-tier [Amazon Web Services \(AWS\) EC2](https://aws.amazon.com/ec2/) instance for using and deploying Pushkin as an alternative to using WSL on Windows. In your instance, you will be able to run an Ubuntu virtual machine and follow the Ubuntu setup instructions. We suggest accessing this AWS EC2 instance from your local computer using the [PuTTY SSH client](https://www.chiark.greenend.org.uk/~sgtatham/putty/), though in principle any SSH client for Windows should work.

## Skip to section

* [Create your AWS EC2 instance](ec2-install.md#create-your-aws-ec2-instance)
* [Install and configure PuTTY](ec2-install.md#install-and-configure-putty) 
* [Connect to your EC2 instance](ec2-install.md#connect-to-your-ec2-instance)
* [Managing your AWS instance](ec2-install.md#managing-your-aws-instance)
* [Next steps](ec2-install.md#next-steps)

### Create your AWS EC2 instance

#### Create your AWS Account

Go to [Amazon Web Services](https://aws.amazon.com/free/) and click _Create a free account_.

![](../../.gitbook/assets/1%20%281%29.gif)

Complete the sign-up process and go to your inbox to confirm your email address.

#### Launch your EC2 Instance

Head to the [AWS EC2 console](https://console.aws.amazon.com/ec2/v2/home) and, in the left sidebar, click _Instances_.

![](../../.gitbook/assets/2%20%281%29.gif)

Click on the _Launch Instance_ button. 

![](../../.gitbook/assets/3%20%281%29.gif)

Scroll down to the **Application and OS Images (Amazon Machine Image)** and under the **Quick Start** tab and click on Ubuntu. The default selected should say _Free tier eligible_, but if it doesn't, click on the box and select a version that is free. 

Now, scroll down to the **Key pair (login)** option, and on the bottom right, click on **Create new key pair**, create a new key pair and give it a name, \(e.g., "pushkin-testing-key"\), set it to **RSA** key type and change the private key format to **.ppk**. **Make sure to dowload this file, keep it somewhere as this will be necessary to connect your instance later**


Next, on the right of the **Network settings** heading, select _Edit_.

Select _Add security group rule_, under _Type_, choose **HTTP** in the drop-down menu. Then, select _Add rule_ again and, under _Type_, select "HTTPS". 

Now, click on **Launch Instance**.

![](../../.gitbook/assets/9%20%281%29.gif)

Next, in the box that says "Your instances are now launching," click the instance ID, which will be an alphanumeric string.

![](../../.gitbook/assets/10%20%281%29.gif)

This will take you to the AWS EC2 console. You should keep this window open.

### Connect to your EC2 instance

In the Windows start menu, open **PuTTY**.

In the **Category** pane, choose **Session**.

![](../../.gitbook/assets/16%20%281%29.gif)

In the _Host Name_ box, enter "ubuntu@" followed by the public DNS of your instance.

![](../../.gitbook/assets/17%20%281%29.gif)

The public DNS is found on the AWS EC2 console. One example is "ec2-18-191-193-31.us-east-2.compute.amazonaws.com". The 2- and 3-digit numbers will be different for each instance and "us-east-2" is based on what region you are in.

![](../../.gitbook/assets/13%20%281%29.gif)

Ensure that the _Port value_ is **22**, the under _Connection type_ select **SSH**.

![](../../.gitbook/assets/18%20%281%29.gif)

In the Category pane, expand **Connection**, expand **SSH**, expand **Auth**, then choose **Credentials**.


Select the ".ppk" file you generated for your key pair and choose **Open**.



If you plan to start the session again later, you can save the session information. Under _Category_, choose **Session**, enter a name for the session in _Saved Sessions_, and then choose **Save**.

**Note:** When you stop running the AWS instance from the AWS console, on restart the IP address and the Public DNS will be different. If you save your settings in PuTTY, you will need to replace part of your host name with the new IP address. All other saved settings remain the same.

![](../../.gitbook/assets/21%20%281%29.gif)

You can now choose **Open** to connect to your instance. PuTTY will display a security alert dialog box asking if you trust the host you are connecting to: choose **Yes**.

![](../../.gitbook/assets/22%20%281%29.gif)

You are now connected to your instance! In the window that appears, run the following commands to update your Ubuntu EC2 instance:

```bash
$ sudo apt update
$ sudo apt upgrade
```

![](../../.gitbook/assets/34.gif)

![](../../.gitbook/assets/35.gif)

While upgrading, a box may come up that says the following:

```text
A new version of /boot/grub/menu.lst is available, but the version installed currently has been locally modified.
```

Use the UP arrow key to select `install the package maintainer's version` and press ENTER to continue.

![](../../.gitbook/assets/30.gif)

\(For more on package management with apt, you can see the documentation [here](https://ubuntu.com/server/docs/package-management). To learn more about the basics of the Linux command line, you can follow [this tutorial](https://ubuntu.com/tutorials/command-line-for-beginners#1-overview).\)

### Managing your AWS instance

#### Remember to stop your instance

To avoid incurring charges on AWS's Free Tier, always shut down your AWS EC2 instance when you're done using it. To do this, go to the AWS EC2 console, right-click on your instance, expand _Instance State_, and select **Stop**. When a dialog box appears, click **Yes, Stop**.

![](../../.gitbook/assets/33.gif)

#### How to restart your instance

To restart your instance, go to the AWS EC2 console, right-click on your instance, expand _Instance State_, and select **Start**.

![](../../.gitbook/assets/32.gif)

### Next steps

From here, you can follow the instructions for [Ubuntu Linux](ubuntu-install.md) to finish the installation.

