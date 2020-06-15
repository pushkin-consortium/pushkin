# Making an Experiment

To create a new experiment from the boilerplate template Pushkin provides, run

```bash
$ pushkin experiment basic myexp
$ pushkin init myexp
```

replacing “myexp” with a short name of your experiment. This will create a new folder in the experiments directory like

```text
└── myexp
    ├── api controllers
    ├── config.yaml
    ├── migrations
    ├── seeds
    ├── web page
    └── worker
```

Each folder in here contains something unique to this experiment. There’s also a configuration file that allows us to define a full name for the experiment and specify what database to use, among other things.

Keeping all the files for an experiment within the same root folder is convenient for development, but not for actually deploying the website. To redistribute the experiment files to the right places, run:

```bash
$ pushkin prep
```

