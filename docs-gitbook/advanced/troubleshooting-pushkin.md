# Troubleshooting Pushkin

### error: database "test\_db" does not exist

In cases where your database does not successfully get set up, it's possible that Postgres is clogging port 5432 on your computer. To check if this is the case run the following in Terminal/your command line: `sudo lsof -i tcp:5432`

If Postgres is running on port 5432, run the following to clear it: `sudo pkill -u postgres`

### Cannot start service server: Ports are not available: listen tcp 0.0.0.0:80: bind: address already in use

You must have Port 80 open to run your Pushkin site locally, so make sure you aren't running any other web servers there before running `pushkin prep`. If you encounter this error, you can find what is clogging your Port 80 using the command: `lsof -i tcp:80`. The output should look something like this:

![](../.gitbook/assets/ls_output.png)


Then to clear the port, run the following (replacing `<PID>` with the PID(s) listed from the lsof command above): `kill -9 <PID>`

### homebrew install not working

Homebrew is not compatible with some shells such as tcsh, try using bash or xsh instead.

### Error: The migration directory is corrupt in `pushkin prep`
This can happen when your database is still configured for another Pushkin site set up on your system. Pushkin does not currently support two active Pushkin sites at the same time, so if you would like to switch between Pushkin sites you're working on, you'll have to run `pushkin kill` before running `pushkin prep` and make sure that the docker images are cleaned out.

### Error: no space left on device
If you are using Pushkin on an Amazon EC2 instance and have several experiments installed, you may run out of space on your instance. If you get an error stating that there is no space left on your device, you will need to increase the amount of disk space allocated to your instance in order to continue.

At the time of writing, the AWS Free Tier includes [30 GB of Elastic Block storage](https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsf.Free%20Tier%20Categories=categories%23storage)&mdash;the kind of storage your EC2 instance uses&mdash;for the first 12 months of your AWS membership. Remember that deploying Pushkin to AWS also includes using some of that storage. Increasing from the default 8 GB of storage to 16 GB might be a good start.

[This tutorial](https://medium.com/findworka/how-to-increase-disk-size-for-an-ec2-instance-on-aws-b82181df6215) explains how to increase the disk size of your EC2 instance.

You can also try, regardless of the platform you are using, running the command `docker system prune` might solve the issue:

[Stackoverflow thread on docker system prune](https://stackoverflow.com/questions/50142049/enospc-no-space-left-on-device-nodejs/57705821#57705821)

### Command failed: docker buildx build

If you have an older version of Docker, you might run into this error. The solution is to upgrade Docker:
- Confirm that you have at least Docker Engine 23.0 and Docker Desktop 4.19. 
- From the commandline, run `docker buildx create --name mybuilder --driver docker-container --bootstrap --use`

**If you have any problems not listed here, check out our** [**Pushkin forum**](https://github.com/pushkin-consortium/pushkin/discussions) **to see if others have had the same problem or report the problem to our team.**
