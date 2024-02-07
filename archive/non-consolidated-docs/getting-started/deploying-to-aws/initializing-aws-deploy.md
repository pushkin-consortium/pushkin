# Initializing AWS deploy

Run:

```bash
 pushkin aws init
```

You should be asked to name your project, to enter the aws profile you want to use (usually just "default"), choose a security certificate, and choose a domain name. In the latter two cases, the certificate and domain you created in the steps above should be available as options (if not, check that you completed those steps and can see the resources in the AWS console).

It usually takes 5-10 minutes for the program to complete. It tends to stick at "Finished syncing files" and "Creating ECS tasks," although the exact location could change in future versions. When the program successfully completes, you should be able to navigate to your website at your chosen domain.

### What do I do if aws init crashes?

Deploying to AWS is very complicated. Sometimes, it will fail. Try debugging by doing the following in the following order:

1. Try rerunning `pushkin aws init`.
2. Try deleting your deploy (` pushkin aws armageddon`) and then running (` pushkin aws init --force`). The `--force` tag insures that any local aws config information is reset.
3. Ask for help on the [Pushkin forum](https://github.com/pushkin-consortium/pushkin/discussions). Post ALL of the output from your run of aws init.

## Deleting your AWS deploy

AWS will charge you for services you have running. If you are just doing a test site, you may want to delete it afterwards to minimize charges. Run:

```bash
 pushkin aws armageddon
```

When it completes, Armageddon will list remaining services that it hasn't deleted. Armageddon is usually unable to delete everything the first time. This is certain services can't be deleted until other services have finished deleting. You will usually see an error message. Wait a few minutes and run `pushkin aws armageddon`. The second time should be the charm. If you are still having problems, see [deleting through the console](../../advanced/deploying/awsDeletion.md).

**To get the latest news and updates on Pushkin, sign up for our newsletter** [**here.**](https://groups.google.com/g/pushkinjs)
