# Using Experiment Templates

## Skip to section

* [Current templates](./#current-templates)
* [General settings and editing content](./#general-settings-and-editing-content)
* [Adding custom jsPsych plugins](./#adding-custom-jspsych-plugins)

To install an experiment template, type in the following command, then select the desired template when prompted. Typically, you will want to select the most recent version.

```bash
$ pushkin install experiment
```

Over time, new site and experiment templates are likely to be added. If you want access to more recently released templates, update your CLI:

```bash
$ yarn global upgrade pushkin-cli
```

## Current templates

* [Lexical decision template](lexical-decision-template.md)
* [Grammaticality judgement template](grammaticality-judgement-template.md)
* [Self-paced reading template](self-paced-reading-template.md)

## General settings and editing content

Most Pushkin native experiment templates will include the following files for editing the settings and content of your experiment. The basic experiment template is the exception, and is a fairly bare bones template for customization.

### config.js

This file contains some settings you can customize for the experiment. Currently, the default settings in every experiment template are:

* **fontColor**: Set the color for the experiment's font. This can be a web color name, a hex color code, or rgb setting. The default setting is "black."
* **fontSize**: Set the font family. This accepts any font family universally available to web browsers.
* **fontFamily**: Set the font family. 

### stim.js

Stimuli are added using the stim.js file, which contains an array to put your stimuli information into. More details on editing the stimuli data for each specific experiment in their respective documentation pages.

### consent.js

Add text to this file that you want on your consent page.

### debrief.js

Add text to this file for debrief information at the end of the experiment.

## Adding custom jsPsych plugins

The native jsPsych plugins currently get added to the index.js of an experiment, accessing the files on CDN online. If you build a custom plugin, you will need to:

1. Add the plugin file to the `web page/src` folder of the experiment
2. Import jsPsych into the top of the custom plugin file like so: `import jsPsych from 'pushkin-jspsych';`
3. Add the plugin towards the top of your experiment.js file like so: `require("./jspsych-moving-window.js");`

