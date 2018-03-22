## Requirements
You need git for the various steps of deployment. If you are working on a Mac, you have git already installed. If you are working on a PC, make sure you install git and familiarize yourself with the basic commands before proceeding.

You will need a GitHub account. Ensure that you have created one before proceeding.

You will need to install [Docker](https://docs.docker.com/docker-for-mac/install/#download-docker-for-mac) and [create an account] (https://id.docker.com).

You will need a Postgres manager. For example, you can download [SQLPro for Postgres](https://macpostgresclient.com/).

Some repository and file names should be changed when customizing the setup. However, the instructions will contain the original names for simplicity. Make sure you replace all the relevant names in any commands you execute.

##Forking the Relevant Repos to Work on a Custom Setup
Once you have logged into your GitHub account, navigate to the [Games With Words organization](https://github.com/gameswithwords). Click on [**gww**](https://github.com/gameswithwords/gww) and fork the repository. Change the name of the repository (Settings->Repository name). 
Return to the [Games With Words organization](https://github.com/gameswithwords), and fork [**cron**](https://github.com/gameswithwords/cron), [**experiments**](https://github.com/gameswithwords/experiments), and [**front-end**](https://github.com/gameswithwords/front-end).

##First Steps for Local Deployment 

###Setting Up Databases

Open your Postgres manager, select **New** and fill out the following fields:

**Server host:** localhost  
**Login:** postgres  
**Server port:** 5432  
**Database:** dev

Create another database with the following information:

**Server host:** localhost  
**Login:** postgres  
**Server port:** 5433  
**Database:** transactions_dev

### Front End Deployment
  
* Open Terminal
* You will need to clone the forked and renamed **gww** repository:   

```
 git clone [URL]   
```

<span style="color:red">**Important Note**:</span> When cloning, always use https instead of ssh.

* Change the working directory to the folder containing the cloned **gww** repository.
* To place the contents of the **cron**,**experiments**, and **front-end** repositories in the appropriate submodules of **gww**, you will need to remove the submodules which got cloned along with the **gww** repository. The commands to do that are as follows:   

```
$ git submodule deinit cron
  
$ git rm –f cron

$ git submodule deinit experiments

$ git rm -f experiments

$ git submodule deinint

$ git submodule deinit front-end

$ git rm -f front-end
```

* Next, you will need to add the deleted submodules from the forked repositories on your GitHub account (again, these are **experiments**, **cron**, and **front-end**). Replace [URL] in the following command with the GitHub URL for each of those repositories before executing:

```
$ git submodule add [URL] 
```

* After adding front-end, the submodule jsPsych will remain empty. To add the contents of jsPsych, go back to the front-end repository on GitHub, find the jsPsych submodule and get its URL. From the main **gww** folder execute the following commands to add the jsPsych submodule:

```
$ git submodule deinit jsPsych

$ git rm jsPsych

$ git submodule add [URL]
```
* Navigate to the [pushkin-npm organization](https://github.com/pushkin-npm) on GitHub. Click on [pushkin-cli](https://github.com/pushkin-npm/pushkin-cli).
* Clone this repository in the directory containing **gww** (`git clone [URL]`).
* Change your working directory to the folder containing the cloned **pushkin-cli** repository and install:

```
$ cd pushkin-cli

$ npm install –g ./
```
To test whether the Pushkin installation was successful run the command `pushkin`. If the installation was successful, you will get a list of commands that you can execute:

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-08-25%20at%203.29.12%20PM.png)


* Change the working directory back to **gww** (`cd gww`) and run `pushkin sync`

* Change the working directory to **front-end** (`cd front-end`) and run the following commands:

```
$ npm install

$ npm start
```
At this point you should be able to see the front end of the website in your browser.

### Setting Up a Running Docker Container

Provided that you have installed Docker and created a Dockerhub account, you should be able to start a Docker container by running the following command:

```
$ docker-compose -f docker-compose.debug.yml up
```
After the Docker container has been initiated, `cd` into `db-worker` and run `docker ps`. This command will give you a list of containers with their IDs, STATUS, PORTS, and NAMES. Copy the container ID of `db-worker`

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-08-31%20at%2012.27.35%20PM.png)

Run the following command:

```
$ docker exec -it CONTAINER_ID bash
```

Followed by:

```
$ npm run migrations
```
If you have a stimuli file that you would like to use for a quiz, you can run the following command:

```
$ node seeder.js NAME_OF_QUIZ
```
A series of questions will appear; the answer to all of them should be **Yes**.

![logo](https://github.com/marielajennings/Tutorial-images/raw/master/Screen%20Shot%202017-08-31%20at%2012.43.22%20PM.png)

To sync all of the updates, run `pushkin sync` from the **gww** folder.

***IMPORTANT NOTE:*** Every time you make changes to files you will need to rebuild the Docker containers, since the changes do not get updated automatically. To do this, run the following command:

```
$ docker-compose -f docker-compose.debug.yml up --build
```

### Creating a New Quiz

#### The Back End


***IMPORTANT NOTE:*** Do **NOT** use uppercase letters in the name of the new quiz. This will cause problems when the Docker containers are rebuilt after the quiz has been added.

To begin, you will need to `cd` into the **gww** folder. Pushkin offers the option of generating the basic files needed for a new quiz. Alternatively, you can modify the files for an existing quiz. To generate the template files for a new quiz run:

```
$ pushkin generate dbItems QUIZ_NAME
```
OR

```
$ pushkin scaffold QUIZ_NAME
```

All the scaffolded files for a quiz can be found in a folder with the quiz name located in the **experiments** folder. After those files have been modified to reflect the requirements of the new quiz, run the following commands:

```
$ pushkin sync
```
After syncing, open the **docker-compose.debug.yml** file and make sure that the new quiz has been added to the end of the file. Pay attention to the **image**. Make sure it follows the same format as previous quizzes. When all the required changes have been made, run:

```
$ docker-compose -f docker-compose.debug.yml up --build
```

to rebuild the Docker containers, followed by:

```
$ cd db-worker
$ docker ps
```
Select the Container ID of db-worker and run:

```
$ docker exec -it CONTAINER_ID bash
$ npm run migrations
$ node seeder.js NAME_OF_QUIZ
```
A series of questions will appear; the answer to all of them should be **Yes**.

#### The Front End

To create the front end for the quiz,

In the `/front-end/experiments` folder, each quiz has its own folder with the React code for the quiz and the jsPsych plugins used by the quiz. You will need to create a new folder with those files for the quiz you want to publish. 
Additionally, you will need to add the link to the quiz in `front-end/pages/quizzes/index.js`.
The last step is adding your new quiz to `/front-end/core/routes.js'



and add the files for the new quiz or copy and update the files from an existing quiz to reflect the content of the new quiz. The stimuli for the quiz can be added into the `public\quizzes` folder located inside the `front-end` folder.

You will also need to add the quiz in the `pages\quizzes\index.js`.
