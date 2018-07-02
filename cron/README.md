![Pushkin Logo](http://i.imgur.com/ncRJMJ5.png)

# Overview
Pushkin Cron's job is to run user defined period scripts

# Core Features
* `node` and `python` runtimes built in.
* set up using standard cronttab syntax
* provides access to all environment variables


# Get started
1. Edit or create new scripts in the scripts folder.
2. Create a line in the `crontab` file that points to your script
3. Easiest way to build this file is using [crontab generator](http://crontab-generator.org/).
4. Rebuild container

# Extension
* Change the timezone to whatever you want by setting the `TZ` env variable in the `Dockerfile`
* Share and publish other scripts that you may find useful
