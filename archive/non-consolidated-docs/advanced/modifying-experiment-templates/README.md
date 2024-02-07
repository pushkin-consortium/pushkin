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
- [Grammaticality judgment template](grammaticality-judgement-template.md)
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

The next time you run `pushkin prep`, any additional jsPsych plugins you want to import will be automatically added as dependencies to your experiment's web page component (provided they are available via npm -- this does not apply to custom plugins). If, for some reason, you wish to add these dependencies yourself prior to running `prep`, navigate to the `web page` directory of the experiment using `cd` and run `yarn add` for each particular plugin:

```bash
 cd 'experiments/[experiment_name]/web page'
 yarn add @jspsych/plugin-survey-text
 yarn add @jspsych/plugin-html-button-response
```

See [Yarn's documentation](https://classic.yarnpkg.com/lang/en/docs/cli/add/) for instructions regarding adding specific versions of a particular package.

This same procedure will work with community-developed plugins available through npm via the [jspsych-contrib repository](https://github.com/jspsych/jspsych-contrib). Just replace "@jspsych" with "@jspsych-contrib". The [self-paced reading template](self-paced-reading-template.md) uses a [plugin](https://github.com/jspsych/jspsych-contrib/blob/main/packages/plugin-self-paced-reading/docs/jspsych-self-paced-reading.md) from jspsych-contrib.

## Adding custom jsPsych plugins

The procedure above only works for jsPsych plugins available through npm. If your experiment makes use of a custom plugin, follow the steps below:

1. Add the plugin file to the `web page/src` folder of the experiment
2. Add the plugin towards the top of your experiment.js file like `import jsPsychMovingWindow from './jspsych-moving-window';`

## Adding static assets

The current experiment templates do not use any image, audio, or video stimuli. In order to reference static assets such as these in your jsPsych timeline, put them in the experiment's `web page/src/assets/timeline` folder. You can use whatever directory structure inside that folder you please, if, for instance, you want to keep audio files separate from images or divide assets from different experimental lists. When you run `pushkin prep`, the contents of the timeline assets folder will be copied to `pushkin/front-end/public/experiments/[experiment_name]`, where `[experiment_name]` is replaced with the same name as the folder within your site's experiments directory. The folder `pushkin/front-end/public` can be referenced at runtime using the environment variable `process.env.PUBLIC_URL`. Thus, when you refer to static assets in your jsPsych timeline, the reference should be as follows.

Assume your experiment's `web page/src/assets/timeline` directory looks like this:

```text
└── timeline
    ├── colors
    │   ├── blue.png
    │   └── orange.png
    ├── shapes
    │   ├── square.jpg
    │   └── circle.jpg
    ├── cat.mp4
    └── dog.mp4
```

Then references to these files in your experiment would look like:

```javascript
var block_1_stimuli = [
  { stimulus: process.env.PUBLIC_URL + "/[experiment_name]/colors/blue.png" },
  { stimulus: process.env.PUBLIC_URL + "/[experiment_name]/shapes/square.jpg" },
  { stimulus: process.env.PUBLIC_URL + "/[experiment_name]/cat.mp4" },
];

var block_2_stimuli = [
  { stimulus: process.env.PUBLIC_URL + "/[experiment_name]/colors/orange.png" },
  { stimulus: process.env.PUBLIC_URL + "/[experiment_name]/shapes/circle.jpg" },
  { stimulus: process.env.PUBLIC_URL + "/[experiment_name]/dog.mp4" },
];
```

The other contents of `web page/src/assets` should be static assets that will be imported by React. The reason for this process of copying to the site's public folder is that jsPsych timelines are not compiled by React. By the time jsPsych runs, the files here are no longer accessible. While you could store timeline assets from the beginning in the site's public folder, keeping them in the experiment's timeline assets folder allows you to store all of a particular experiment's resources in the same place. Additionally, your experiment &mdash; along with all its multimedia stimuli &mdash; can now be distributed as a template.

Note that `process.env.PUBLIC_URL` works for local development. Depending on how you deploy to the web, this environment variable may not be available.
