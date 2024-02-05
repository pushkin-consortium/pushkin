# Customizing Experiments

## Experiment Component Structure

From the perspective of the web server, a Pushkin experiment involves a number of distinct elements. There is the HTML/Javascript for the stimulus display and response recording \(the “front end”\). There is the database, where data are stored. There is the worker, which handles reading and writing from the database \(plus potentially many other behind-the-scenes work!\). Finally, there is the API, which communicates between the front end and the worker.

For convenience, all the code is kept in the experiments folder as defined in `pushkin.yaml`. The CLI command [prep](../../packages/pushkin-cli.md###prep) automagically redistributes this code where it needs to go.

## Experiment Config.yaml Files

The config.yaml file provides information to the rest of Pushkin about the experiment. Below is a sample of what one might look like.

```javascript
experimentName: &fullName 'pushkintemplate Experiment'
shortName: &shortName 'pushkintemplate'
apiControllers:
  - mountPath: *shortName
    location: 'api controllers'
    name: 'mycontroller'
worker:
  location: 'worker'
  service:
    image: *shortName
    links:
      - message-queue
      - test_db
    environment:
      - "AMQP_ADDRESS=amqp://message-queue:5672"
      - "DB_USER=postgres"
      - "DB_PASS="
      - "DB_URL=test_db"
      - "DB_NAME=test_db"
webPage:
  location: 'web page'
migrations:
  location: 'migrations'
seeds:
  location: 'seeds'
database: 'localtestdb'
logo: 'logo512.png'
text: 'Enter your experiment description here.'
tagline: 'Be a citizen scientist! Try this quiz.'
duration: ''
```

Each of the above fields is explained in detail below.

### experimentName

The full name of your experiment. This is used as a display name on the website to users.

### shortName

This is a short, more computer-friendly version of your experiment’s name. It should be unique as it is used as the folder name in the experiments folder.

### apiControllers

Note that this is an array. As many API controllers can be used as needed.

#### mountPath

URL this controller’s endpoint will be available at. The full path is /api/\[mountPath\].

#### location

Path relative to config file the CLI will look for this module in.

### name

Used in logs.

### worker

### location

Path relative to config file the CLI will look for this module in.

### service

This section is appended to Pushkin’s core Docker Compose file. Note that message-queue is a requirement. If you’re not using the local test database, test\_db is not necessary. Database connections credentials should be unique to every user. The defaults are shown here for the testing database.

## webPage

### location

Path relative to config file the CLI will look for this module in.

## migrations

### location

Path relative to config file the CLI will look for these files.

## seeds

### location

Path relative to config file the CLI will look for these files. If you aren’t seeding a database table, set this to `''`. Otherwise, if the folder pointed to by `location` is empty, database setup will fail.

## database

A reference to a key defined in the core Pushkin config file. Experiments can share databases. The CLI will use this database to migrate and seed experiment data files. It is not used as connection information for any of the modules running the experiment, since these may or may not be inside containers and cannot use the same connection details as the CLI.

## logo, text, tagline, duration, other

You may find it useful to include information about your experiment here that can be used by `front-end` to describe the experiment to potential subjects. For instance, the default pushkin site template uses:

* `logo`: Image to be used as the logo for the experiment. The logo images should be stored in `pushkin/front-end/src/assets/images/quiz`.
* `text`: The experiment description to be displayed for users to determine what quiz to play.
* `tagline`: This is the description that shows when a quiz is shared via social media/email.
* `duration`: The average length of the experiment to give users an idea of the time commitment.

Note that no path is given for the logo because the default pushkin site template assumes this is in `front-end/src/img`.

# Worker Component, Migration, and Seed

## Experiment Worker Component

Workers handle the most complex aspect of a Pushkin experiment and different types of experiments could need workers with very different functionalities. Pushkin provides a simple template written in Javascript to start with.

The job of a worker is to receive messages via RabbitMQ that \(usually\) come from an API controller. It looks up the appropriate information in the database and returns it to the requester. Workers are also the component that is responsible for implementing machine learning, as having direct access to this data allows it to make live, dynamic decisions during an experiment like what stimuli to serve next or predictions about a subject’s next answers.

## Experiment Migrations

Pushkin uses [knex](https://knexjs.org/) to manage database tables. Files inside the migrations directory are migration files that describe how to set up and take down the tables needed for an experiment. The CLI handles the details of connecting to and executing the appropriate order of commands required to set up all experiment’s tables. Once the table structure has been created, [seeding](https://pushkin-social-science-at-scale.readthedocs.io/en/latest/experiments/exp_seeds.html#exp-seeds) is used to populate the database with experiment data, such as stimuli.

When making a new experiment with new migrations, it is helpful to prefix the filenames with numbers in order to get the order right \(you want tables that are going to be referenced by other tables to be created first, so giving them an alphabetically earlier filename is helpful\).

## Experiment Seeds

Pushkin uses [knex](https://knexjs.org/) to facilitate moving data into an experiment’s tables in a database. Files inside the seeds directory are seed files containing the data to be moved and directions on where to put it. Each experiment’s seed files should align with the structure defined in its migration files. The CLI handles the execution of these files.

# Experiment Web Page Component

This houses the front-end component of an experiment. Dependencies are listed in the package.json file, which are packaged by the CLI and attached to the core website using the shortName defined by the experiment’s config.yaml file. Pushkin uses React for the front end. Experiment web pages are mounted as React components and given the full size of the window under the header and navigation bar.

## Recommended Structure

At a minimum, the `web page/src` folder needs to contain an `index.js` file that includes all your experiment code. Technically, you don't even have to use jsPsych to implement your experiment. However, we recommend building on top of an [experiment template](../modifying-experiment-templates/README.md). The `src` folder in experiment templates contains both `index.js` and `experiment.js` files. `experiment.js`, contains a function `createTimeline()`, within which you construct a jsPsych timeline just as you would for a standard jsPsych experiment; `createTimeline()` is then exported to `index.js`. The core functionality of interest is here:

```javascript
  async startExperiment() {
    this.setState({ experimentStarted: true });

    await pushkin.connect(this.props.api);
    await pushkin.prepExperimentRun(this.props.userID);

    const jsPsych = initJsPsych({
      display_element: document.getElementById('jsPsychTarget'),
      on_finish: this.endExperiment.bind(this),
      on_data_update: (data) => pushkin.saveStimulusResponse(data),
    });

    jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties

    const timeline = createTimeline(jsPsych);

    jsPsych.run(timeline);

    document.getElementById('jsPsychTarget').focus();
    this.setState({ loading: false });
  }

  async endExperiment() {
    document.getElementById("jsPsychTarget").innerHTML = "Processing...";
    await pushkin.tabulateAndPostResults(this.props.userID, expConfig.experimentName)
    document.getElementById("jsPsychTarget").innerHTML = "Thank you for participating!";
  }
```

A line of code worth noting is `on_data_update: (data) => pushkin.saveStimulusResponse(data)`. This uses a helper function from pushkin-client to save data each time the jsPsych [on_data_update callback](https://www.jspsych.org/7.3/overview/events/#on_data_update) is triggered (i.e. at the end of each trial). Saving data after each trial is generally good practice, as opposed to sending all the data at the end of the experiment. You could write this behavior into the timeline itself, but this helper function saves some typing.

Finally, when the timeline finishes, `endExperiment()` will be called. In the current experiment templates, this simply adds a "Thank you for participating" message. [Current templates](../modifying-experiment-templates/README.md#current-templates) besides the basic template include some simple feedback which is specified _inside_ the jsPsych timeline; however, one might have reasons for integrating more complex feedback into `endExperiment()`.

### Assets

The `assets` folder primarily contains static assets that will be imported by React. It also contains a folder called `timeline`, which holds assets which are needed inside the jsPsych timeline (e.g. audiovisual stimuli). The contents of the timeline assets folder get copied to the site's `pushkin/front-end/public/experiments/[experiment_name]` folder during `pushkin prep`. The reason this is necessary is that jsPsych timelines are not compiled by React, so the contents of the `assets` directory will not be accessible when jsPsych runs. However, create-react-app provides a nifty workaround: `process.env.PUBLIC_URL` will point to the folder `pushkin/front-end/public` during runtime.

See [here](../modifying-experiment-templates/README.md#adding-static-assets) for an example of how to refer to audiovisual stimulus files within a jsPsych timeline.

## Customizing the client

{ This section is a work in progress! }

If you need to extend the client with custom API calls, etc., you should extend the defaultClient class. For instance, rather than loading the pushkin client directly:

You would first extend it, adding any additional methods you need:
