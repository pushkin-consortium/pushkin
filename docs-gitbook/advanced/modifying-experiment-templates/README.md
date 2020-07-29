# Modifying Experiment Templates

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

Stimuli are added using the stim.js file, which contains an array to put your stimuli information into.

### consent.js

Add text to this file that you want on your consent page.

### debrief.js

Add text to this file for debrief information at the end of the experiment.

