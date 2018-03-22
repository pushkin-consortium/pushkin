![Pushkin Logo](images/logo.png)

Pushkin is a scalable ecosystem for psychological surveys and tests.

It consists of 5 key parts

![](http://i.imgur.com/ncRJMJ5.png)

#####  [Pushkin-Api](https://github.com/l3atbc/pushkin-api#pushkin-api)
#####  [Pushkin-Cli](https://github.com/l3atbc/pushkin-cli#pushkin-cli)
#####  [Pushkin-DB](https://github.com/l3atbc/pushkin-db/blob/master/README.md#pushkin-db)
#####  [Pushkin-Worker](https://github.com/l3atbc/pushkin-worker#pushkin-worker)
#####  [Pushkin-Cron](https://github.com/l3atbc/pushkin-cron/blob/master/README.md#overview)

## Why Pushkin

## Assumptions
1. You are somewhat familiar with isntalling programs and understand what your terminal is and how to use it.
2. You have access to a text editor like sublime/notepad++/etc.
3. [Docker](http://docker.com) is installed on your machine


## Getting started

### Development Mode
1. docker-compose -f docker-compose.debug.yml up


## Deploying

[Deploy Instructions Here](https://github.com/l3atbc/pushkin/blob/master/DEPLOY.md#deploying)

## Directory Structure

## Common Tasks

### Cronjobs

Pushkin makes adding a cron job easy, 
1. just add the file script you want ran in games-with-words-cron/scripts.
2. Add a line calling that file in games-with-words-cron/crontab

Each one of those files has access to the environment variables created in the docker file.

DB Connection is available as `DATABASE_URL` and the message queue as `AMPQ_ADDRESS`.

Right now we only support python and node.js cron tabs. feel free to modify the `Dockerfile` to add a different environment you may need.

### Documentation
Docs can be created by running npm install, then npm run docs.

JS Docs are available for this project, all the document files are located in your `pushkin/docs` folder. For more information about JS Docs, please visit [JS Docs](http://usejsdoc.org/).

#### Add Js Docs
You could add a piece of Js Docs anywhere for any functions through out the whole project by using this syntax : 
```sh
  /**
   * creates a new controller with specified name
   * @method ControllerManager#generate
   * @param {String} name - name of controller to create
   * @memberof ControllerManager
   */
```
This will get compiled down in your `pushkin/docs` folder and available for view. Please read the Compile section of this readme for more info.

#### Config
Please feel free to modify `jsdoc.conf.json` located in your main `pushkin` folder. This config file handles the main configuration of JS Docs compile settings. You could include or exclude any additional source folders for JS Docs to look in or ignore by editing the `include` and `exclude` section of this JSON file. You could also include a README as the home page of your js docs by adding `README.md` in the `include` section of this file. JS Docs looks for the first README.md it could find and make use of that.

#### Compile
After you've added/deleted/edited/changed any your JS Docs, you will have to recompile for the changes to apply. 

1. make sure you've all npm pacages installed in your 'pushkin' folder by executing `npm install`
2. execute `npm run docs` to compile
3. open up `pushkin/docs/index.html` to see your newly updated JS Docs

## Roles and Permissions

## Acknowledgements

Josh DeLieuw of jspsych
