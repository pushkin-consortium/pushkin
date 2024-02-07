# Overview of experiment templates

Experiments are added to a Pushkin site via templates. Experiment templates are distributed as [npm packages](https://www.npmjs.com/org/pushkin-templates), which get added to the user's site as dependencies when they run `pushkin install experiment`. The template files are then unzipped into the corresponding experiment directory and subsequently manipulated by the CLI.

## Currently available experiment templates

 - [**exp-basic:**](exp-basic.md) The basic template generates a simple "Hello, world!" experiment. Use this template if you want to create your own custom Pushkin experiment from scratch.
 - [**exp-grammaticality-judgment:**](exp-grammaticality-judgment.md) The grammaticality-judgment template includes an experiment in which participants rate the acceptability of target sentences.
 - [**exp-lexical-decision:**](exp-lexical-decision.md) The lexical-decision template includes an experiment in which participants must choose as quickly as possible whether two strings are true words of English.
 - [**exp-self-paced-reading:**](exp-self-paced-reading.md) The self-paced-reading template includes an experiment in which participants read sentences presented in word-by-word fashion.

## How to install an experiment template

In your Pushkin site directory, run:

```
pushkin install experiment
```

or

```
pushkin i exp
```

The other permutations `pushkin i experiment` and `pushkin install exp` will likewise work. Follow the CLI's prompts to select the template you want to install. In addition to templates from the main distribution, the CLI also offers you the ability to install templates from:

 - **path:** This option allows you to install an experiment template from a local path. In this case, the template must still be implemented as a package and will automatically be locally published using [`yalc`](https://github.com/wclr/yalc). Use this option if you are developing a new experiment template or testing a development version of an existing one.
 - **npm:** The CLI can attempt to install an experiment template from an arbitrary npm package, although obviously this will fail if the package isn't properly set up as a Pushkin experiment template. This option might be appropriate for you if you need to distribute a template you've developed (perhaps as private package) but don't wish to add it to the main Pushkin distribution. Generally, however, we encourage contributions of new templates that might be of use to the the broader Pushkin community (see our [contributor guidelines](../developers/contributor-guidelines.md) and [below](#contributing-experiment-templates) for specific notes on contributing experiment templates).

## Customizing experiments



## Contributing experiment templates

There is currently no way of automatically packaging up an existing custom experiment into a new experiment template. How complicated the process will be of turning your experiment into a template depends on how much customization you've done (presumably based on the basic template). If all you've done is edit `experiment.js` and add a few jsPsych plugins, it should be easy to make those same changes to the basic template itself; on the other hand, more complex customizations may present unexpected challenges for creation of a template. We encourage potential template contributors to reach out to the Pushkin team if they encounter any such issues.

In general, we encourage you to follow to the [contributor guidelines](../developers/contributor-guidelines.md). Additionally, if you'd like to contribute a template, please consider how you can make it maximally general by parameterizing as many of your customizations as you can. Try to imagine what variations on your experiment would be relevant for other researchers and make it easy to implement those variations via changing configuration settings.