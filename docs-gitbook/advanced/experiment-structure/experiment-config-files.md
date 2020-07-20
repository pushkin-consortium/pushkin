# Experiment Config.yaml Files

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
tagline: 'Be a citizen scientist! Try this quiz.'
duration: ''
```

Each of the above fields is explained in detail below.

## experimentName

The full name of your experiment. This is used as a display name on the website to users.

## shortName

This is a short, more computer friendly version of you experiment’s name. It should be unique as it is used as the folder name in the experiments folder.

## apiControllers

Note that this is an array. As many API controllers can be used as needed.

### mountPath

URL this controller’s endpoint will be available at. Full path is /api/\[mountPath\].

### location

Path relative to config file the CLI will look for this module in.

### name

Used in logs.

## worker

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

Path relative to config file the CLI will look for these files. If you aren’t seeding a database table, set this to `''`. Otherwise, if the folder pointed to by `location` is empty, `pushkin setupdb` will fail.

## database

A reference to a key defined in the core Pushkin config file. Experiments can share databases. The CLI will use this database to migrate and seed experiment data files. It is not used as connection information for any of the modules running the experiment, since these may or may not be inside containers and cannot use the same connection details as the CLI.

## logo, tagline, duration, other

You may find it useful to include information about your experiment here that can be used by `front-end` to describe the experiment to potential subjects. For instance, the default pushkin site template uses `logo`, `tagline`, and `duration`, which are self-explanatory. Note that no path is given for the logo because the default pushkin site template assumes this is in `front-end/src/img`.

