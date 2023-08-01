# Using Experiment Templates

## Skip to section

- [Current templates](#current-templates)
- [General settings and editing content](#general-settings-and-editing-content)
- [Adding custom jsPsych plugins](#adding-custom-jspsych-plugins)

To install an experiment template, type in the following command, then select the desired template when prompted. Typically, you will want to select the most recent version.

```bash
 pushkin install experiment
```

Over time, new site and experiment templates are likely to be added. If you want access to more recently released templates, update your CLI:

```bash
 yarn global upgrade pushkin-cli
```

## Current templates

- [Basic template](../../getting-started/tutorial-simple-experiment.md) - follow link to see a tutorial adding an existing jsPsych experiment to a Basic pushkin template.
- [Lexical decision template](lexical-decision-template.md)
- [Grammaticality judgment template](grammaticality-judgment-template.md)
- [Self-paced reading template](self-paced-reading-template.md)

## General settings and editing content

Most Pushkin native experiment templates will include the following files for editing the settings and content of your experiment. The basic experiment template is the exception, and is a fairly bare bones template for customization.

### config.js

This file contains some settings you can customize for the experiment. Currently, the default settings in every experiment template are:

- **fontColor**: Set the color for the experiment's font. This can be a web color name, a hex color code, or rgb setting. The default setting is "black."
- **fontSize**: Set the font size.
- **fontFamily**: Set the font family. This accepts any font family universally available to web browsers.

### stim.js

Stimuli are added using the stim.js file, which contains an array to put your stimuli information into. More details on editing the stimuli data for each specific experiment are in their respective documentation pages.

### consent.js

Add text to this file that you want on your consent page.

### debrief.js

Add text to this file for debrief information at the end of the experiment.

## Adding additional jsPsych plugins

The current experiment templates use only the html-keyboard-response plugin from [jsPsych's list of included plugins](https://www.jspsych.org/7.3/plugins/list-of-plugins/) (although the [self-paced reading template](self-paced-reading-template.md) also uses a [custom plugin](#adding-custom-jspsych-plugins)). Of course, for many experiments, you may want to use additional jsPsych plugins. After installing the experiment template, additional plugins can be added to your experiment by navigating to the `web page` directory using `cd` and running `yarn add` for each particular plugin. For example, if your experiment also uses the survey-text and html-button-response plugins, you would run:

```bash
 cd 'experiments/[experiment_name]/web page'
 yarn add @jspsych/plugin-survey-text
 yarn add @jspsych/plugin-html-button-response
```

Be sure to navigate back to the root directory of your site before running `pushkin prep` etc.

## Adding custom jsPsych plugins

The procedure above only works for jsPsych plugins from the official distribution. If your experiment makes use of a custom plugin (either one you've developed yourself or one [contributed](https://github.com/jspsych/jspsych-contrib) by the jsPsych community), follow the steps below:

1. Add the plugin file to the `web page/src` folder of the experiment
2. Add the plugin towards the top of your experiment.js file like `import jsPsychMovingWindow from './jspsych-moving-window';`
