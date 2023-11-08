# Experiment Web Page Component

This houses the front-end component of an experiment. Dependencies are listed in the package.json file, which are packaged by the CLI and attached to the core website using the shortName defined by the experiment’s config.yaml file. Pushkin uses React for the front end. Experiment web pages are mounted as React components and given the full size of the window under the header and navigation bar.

## Recommended Structure

At a minimum, the `web page/src` folder needs to contain an `index.js` file that includes all your experiment code. Technically, you don't even have to use jsPsych to implement your experiment. However, we recommend building on top of an [experiment template](../modifying-experiment-templates/README.md). The `src` folder in experiment templates contains both `index.js` and `experiment.js` files. `experiment.js`, contains a function `createTimeline()`, within which you construct a jsPsych timeline just as you would for a standard jsPsych experiment; `createTimeline()` is then exported to `index.js`. The core functionality of interest is here:

```javascript
  async startExperiment() {
    this.setState({ experimentStarted: true });

    await pushkin.connect(this.props.api);
    await pushkin.prepExperimentRun(this.props.userID);

    const jsPsych = initJsPsych({
      display_element: document.getElementById('jsPsychTarget'),
      on_finish: this.endExperiment.bind(this),
      on_data_update: (data) => pushkin.saveStimulusResponse(data),
    });

    jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties

    const timeline = createTimeline(jsPsych);

    jsPsych.run(timeline);

    document.getElementById('jsPsychTarget').focus();
    this.setState({ loading: false });
  }

  async endExperiment() {
    document.getElementById("jsPsychTarget").innerHTML = "Processing...";
    await pushkin.tabulateAndPostResults(this.props.userID, expConfig.experimentName)
    document.getElementById("jsPsychTarget").innerHTML = "Thank you for participating!";
  }
```

Another line of code worth noting is `on_data_update: (data) => pushkin.saveStimulusResponse(data)`. This uses a helper function from pushkin-client to save data each time the jsPsych [on_data_update callback](https://www.jspsych.org/7.3/overview/events/#on_data_update) is triggered (i.e. at the end of each trial). Saving data after each trial is generally good practice, as opposed to sending all the data at the end of the experiment. You could write this behavior into the timeline itself, but this helper function saves some typing.

Finally, when the timeline finishes, `endExperiment()` will be called. In the current experiment templates, this simply adds a "Thank you for participating" message. [Current templates](../modifying-experiment-templates/README.md#current-templates) besides the basic template include some simple feedback which is specified _inside_ the jsPsych timeline; however, one might have reasons for integrating more complex feedback into `endExperiment()`.

### Assets

The `assets` folder primarily contains static assets that will be imported by React. It also contains a folder called `timeline`, which holds assets which are needed inside the jsPsych timeline (e.g. audiovisual stimuli). The contents of the timeline assets folder get copied to the site's `pushkin/front-end/public` folder during `pushkin prep`. The reason this is necessary is that jsPsych timelines are not compiled by React, so the contents of the `assets` directory will not be accessible when jsPsych runs. However, create-react-app provides a nifty workaround: `process.env.PUBLIC_URL` will point to the folder `pushkin/front-end/public` during runtime.

See [here](../modifying-experiment-templates/README.md#adding-static-assets) for an example of how to refer to audiovisual stimulus files within a jsPsych timeline.

## Customizing the client

{ This section is a work in progress! }

If you need to extend the client with custom API calls, etc., you should extend the defaultClient class. For instance, rather than loading the pushkin client directly:

You would first extend it, adding any additional methods you need:
