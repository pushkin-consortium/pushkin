# @pushkin-templates/exp-basic

The basic experiment template contains a simple "Hello, world!" jsPsych timeline. Its primary uses are for demonstration purposes and to provide a starting point for fully custom experiments.

If you are developing a custom experiment, we recommend doing as much work as possible on your jsPsych timeline as a plain jsPsych `experiment.html` (jsPsych v7+). For example, if you have a somewhat complex experimental flow containing [looping](https://www.jspsych.org/7.3/overview/timeline/#looping-timelines) or [conditional timelines](https://www.jspsych.org/7.3/overview/timeline/#conditional-timelines), it will be **much** faster to test these elements if you can simply reload the page in a web browser. Testing updates to Pushkin experiment can be time-consuming, since you need to repeat the local deploy cyle (`pushkin stop; pushkin prep; pushkin start`) each time you test new code.

Once you have your `experiment.html` working as you want it, dropping the timeline into a Pushkin experiment template is fairly straightforward. This process can be done manually (as described in the [simple experiment tutorial](../getting-started/simple-experiment-tutorial.md)) or automated by [importing a jsPsych experiment](#importing-a-jspsych-experiment) while installing the basic experiment template.

## Installing the exp-basic template

In your Pushkin site directory, run:

```
pushkin i exp
```

Name the experiment and select the main Pushkin distribution. Select `@pushkin-templates/exp-basic` from the list of available templates and choose which version you want (the latest is typically recommended). At this point, you will be asked if you'd like to import a jsPsych experiment. Note this feature only exists for the basic template, as it will overwrite the `experiment.js` file that comes with the template. See the section below on [importing a jsPsych experiment](#importing-a-jspsych-experiment) for details.

## Importing a jsPsych experiment

Selecting the basic template will give you the option to import an existing jsPsych experiment. This feature assumes a workflow where you first implement the basics of your experiment design as a standalone jsPsych experiment, which is faster to test, before turning it into a Pushkin experiment. This feature executes two tasks:

1. Identifying which jsPsych plugins you're using
2. Extracting the code which builds up the experiment's timeline

In order for these tasks to be sucessful, keep the following in mind:

### Plugin identification

- Only jsPsych plugins available via npm can be added automatically (any package scoped under [@jspsych](https://www.npmjs.com/org/jspsych), [@jspsych-contrib](https://www.npmjs.com/org/jspsych-contrib), or [@jspsych-timelines](https://www.npmjs.com/org/jspsych-timelines)). Custom plugins can still be used in your experiment, but you'll need to add them manually, as described [here](exp-templates-overview.md).
- Your experiment.html must use CDN-hosted plugins or import the plugins from npm. Plugins which you've downloaded and are hosting yourself will not be added automatically. See [jsPsych's documentation](https://www.jspsych.org/7.3/tutorials/hello-world/) for details.
- If your experiment.html specifies a specific version of a plugin, `pushkin i exp` records the version number or tag in a comment after the import statement in `experiment.js`. This comment, if present, is later read by `pushkin prep` in order to add that particular version to your experiment. Before running `prep`, you may edit the version number in order to change the version in your experiment, but be careful not to change the format of the comment.
- If you you've forgetten to import a plugin in `experiment.html`, it won't be added to your Pushkin experiment. In this case, your `experiment.html` shouldn't be running properly anyway, so you should hopefully be aware of the problem before trying to import the experiment into Pushkin.
- Likewise, if you import an extraneous plugin that's not actually used in `experiment.html`, it will also be added to your Pushkin experiment.

### Timeline extraction

- This feature works simply by looking for the argument you provide to `jsPsych.run()` and copying everything from where that variable is declared until before `jsPsych.run()` is called. Consequently, the argument of `jsPsych.run()` must be the _name_ of an array of timeline objects, not the array itself.
- Likewise, whatever you name the argument of `jsPsych.run()`, it must be declared before any of its component timeline objects are created. This is fairly standard practice, as something like `const timeline = [];` is usually near the top of most jsPsych experiments.
- Your experiment's equivalent to `const timeline = [];` cannot come before initializing jsPsych (i.e. `const jsPsych = initJsPsych();`). You don't want to call `initJsPsych()` in a Pushkin `experiment.js` (rather, it's called in `index.js`).
- All specifications for your stimuli and timeline must be created inside your `experiment.html` between the two lines of the script mentioned above. If your stimuli or timeline rely on other files, you'll need to [add them manually](./exp-templates-overview.md) (this includes [non-inline CSS styling](../getting-started/simple-experiment-tutorial.md#moving-css-styling)).
