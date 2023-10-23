# Using Experiment Templates

## Skip to section

- [Current templates](#current-templates)
- [General settings and editing content](#general-settings-and-editing-content)
- [Adding additional jsPsych plugins](#adding-additional-jspsych-plugins)
- [Adding custom jsPsych plugins](#adding-custom-jspsych-plugins)

To install an experiment template, type in the following command, then select the desired template when prompted. Typically, you will want to select the most recent version. You also have the option to install templates that are not part of the official Pushkin distribution by using the "path" or "url" options.

```bash
 pushkin install experiment
```

Over time, new site and experiment templates are likely to be added. If you want access to more recently released templates, update your CLI:

```bash
 yarn global upgrade pushkin-cli
```

## Current templates

- [Basic template](../../getting-started/tutorial-simple-experiment.md) - follow link to see a tutorial for adding an existing jsPsych experiment to a basic Pushkin template.
- [Lexical decision template](lexical-decision-template.md)
- [Grammaticality judgment template](grammaticality-judgment-template.md)
- [Self-paced reading template](self-paced-reading-template.md)

## General settings and editing content

Most Pushkin experiment templates will include the following files for editing the settings and content of your experiment. The basic experiment template is the exception, since it is a fairly bare bones template for customization.

### config.js

This file contains some settings you can customize for the experiment. Currently, the default settings in every experiment template are:

- **fontColor**: Set the color for the experiment's font. This can be a web color name, a hex color code, or rgb setting. The default setting is "black."
- **fontSize**: Set the font size.
- **fontFamily**: Set the font family. This accepts any font family universally available to web browsers.

### stim.js

Stimuli are added using the stim.js file, which contains an array to hold your stimulus information. More details on editing the stimuli for each specific experiment template are in their respective documentation pages.

### consent.js

Add text to this file that you want on your consent page.

### debrief.js

Add text to this file for debrief information at the end of the experiment.

## Adding additional jsPsych plugins

The current experiment templates use only a few of [jsPsych's official included plugins](https://www.jspsych.org/7.3/plugins/list-of-plugins/). Of course, for many experiments, you may want to use additional jsPsych plugins. After installing an experiment template, import the additional plugins at the top of your `experiment.js` file in the same way as the plugins already included in the template. For example, if your experiment also uses the survey-text and html-button-response plugins, you would add:

```javascript
import jsPsychSurveyText from "@jspsych/plugin-survey-text";
import jsPsychHtmlButtonResponse from "@jspsych/plugin-html-button-response";
```

You'll also need to add the additional plugins as dependencies for your experiment. To do this, navigate to the `web page` directory of the experiment using `cd` and run `yarn add` for each particular plugin:

```bash
 cd 'experiments/[experiment_name]/web page'
 yarn add @jspsych/plugin-survey-text
 yarn add @jspsych/plugin-html-button-response
```

Be sure to navigate back to the root directory of your site before running `pushkin prep` etc.:

```bash
 cd ../../..
```

This same procedure will work with community-developed plugins available through npm via the [jspsych-contrib repository](https://github.com/jspsych/jspsych-contrib). Just replace "@jspsych" with "@jspsych-contrib". The [self-paced reading template](self-paced-reading-template.md) uses a [plugin](https://github.com/jspsych/jspsych-contrib/blob/main/packages/plugin-self-paced-reading/docs/jspsych-self-paced-reading.md) from jspsych-contrib.

## Adding custom jsPsych plugins

The procedure above only works for jsPsych plugins available through npm. If your experiment makes use of a custom plugin, follow the steps below:

1. Add the plugin file to the `web page/src` folder of the experiment
2. Add the plugin towards the top of your experiment.js file like `import jsPsychMovingWindow from './jspsych-moving-window';`

## Adding static assets

The current experiment templates do not use any image or video stimuli. To use static assets, put them in the `pushkin/front-end/public` directory of your your site. This folder can be referred to using the environment variable `process.env.PUBLIC_URL`.

For example:

```javascript
var test_stimuli = [
  { stimulus: process.env.PUBLIC_URL + "/blue.png" },
  { stimulus: process.env.PUBLIC_URL + "/orange.png" },
];
```

No special imports are required.

Note that this works for local development. Depending on how you deploy to the web, this environment variable may not be available.
