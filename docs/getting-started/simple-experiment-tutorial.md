# Tutorial: A simple experiment

The tutorial below starts with a simple lexical-decision task written in plain jsPsych 7 and explains how to modify this code to run in Pushkin. **This is a recommended tutorial for learning the ropes, but a more complete [lexical-decision experiment template](../exp-templates/exp-lexical-decision.md) is available to install through the Pushkin CLI.**

If you are not familiar with jsPsych, please consult their [documentation](https://www.jspsych.org/). At a minimum, you should understand the basics of [timelines](https://www.jspsych.org/latest/overview/timeline/) and [plugins](https://www.jspsych.org/latest/overview/plugins/) in jsPsych.

!!! note
    As of v3.6 of `pushkin-cli`, the procedures described here for [moving the timeline](#moving-the-timeline) and [importing plugins](#importing-plugins) can be automated if you choose to import a jsPsych experiment during `pushkin install experiment` and select the basic template (v5+). You can still do these tasks manually if you choose. You may also need to do parts of these procedures in the course of modifying one of the other experiment templates.

## Initial jsPsych code

We will start with a simple lexical-decision experiment. The code has been adapted from the experiment [here](https://github.com/jodeleeuw/bigcog-lexical-decision/) in order to be compatible with jsPsych 7. If you save the code below as a `.html` file, you should be able to run it as a standalone jsPsych experiment:

```html title="lexical-decision.html"
--8<-- "docs/assets/getting-started/simple-experiment-tutorial/lexical-decision.html"
```

## Moving the timeline

Following the same procedure as in the [Quickstart](./quickstart.md), create a new basic Pushkin site using `pushkin install site` or navigate to the root directory of an existing Pushkin site. Now run:

```
pushkin install experiment
```

Call your experiment "lexdec" and select the latest version of the basic experiment template. Choose 'no' when asked if you'd like to import a jsPsych experiment.

You should now have a folder in your site called `/experiments/lexdec` with the following content:

```
└── lexdec
    ├── api controllers
    ├── config.yaml
    ├── migrations
    ├── web page
    │    └── src
    │         ├── assets
    │         ├── experiment.js
    │         ├── experiment.test.js
    │         └── index.js
    └── worker
```

Open `/lexdec/web page/src/experiment.js`. It should look like this:

```js title="experiment.js"
--8<-- "templates/experiments/basic/src/web page/src/experiment.js"
```

From the jsPsych code [above](#initial-jspsych-code), copy everything between `const timeline = []` and `jsPsych.run(timeline);` (excluding those lines). Paste that content into `experiment.js` (replacing the existing content) between `const timeline = []` and `return timeline`. Thus you should now have a function `createTimeline()` within which you build up and finally return the timeline for the experiment.

## Importing plugins

In the jsPsych code [above](#initial-code), plugins are loaded with `<script>` tags. In a Pushkin experiment, plugins are loaded with `import` statements. The basic template already includes the `html-keyboard-response` plugin as a dependency, so no additional modifications are needed. If you wanted to add additional jsPsych plugins to this experiment, you would use additional `import` statements in the same format described in the [overview of experiment templates](../exp-templates/exp-templates-overview.md#adding-additional-jspsych-plugins).

## Moving the stimuli

In theory, there's nothing preventing you from declaring your stimuli inside `experiment.js` in the same way as shown above in [`lexical-decision.html`](#initial-jspsych-code); however, we can keep our `experiment.js` tidier by exporting the stimuli from a dedicated file `/lexdec/web page/src/stim.js` like this:

```javascript title="stim.js"
--8<-- "templates/experiments/lexical-decision/src/web page/src/stim.js"
```

Then we need to import `stimArray` into `experiment.js` by adding the following line underneath the `import` statement for the plugin: 

```js
import stimArray from './stim';
```

## Moving the CSS styling

The experiment [above](#initial-jspsych-code) relies on CSS styling from `<link>` and `<style>` tags to display the experiment correctly. This styling needs be moved to `/experiments/lexdec/web page/src/assets/experiment.css` in order to style your Pushkin experiment. The new CSS file will look like this:

```css title="experiment.css"
--8<-- "templates/experiments/lexical-decision/src/web page/src/assets/experiment.css"
```

## Finishing up

At this point, you should be ready to run `pushkin prep` and `pushkin start` to see your new experiment! Refer back to the [Quickstart](./quickstart.md#reorganizing-your-site-for-testingdeployment) for guidance on these commands.