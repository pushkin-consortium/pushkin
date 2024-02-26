# pushkin-client

The Pushkin client is available on NPM under `pushkin-client`. It should be instantiated once imported into a web page (see `/experiments/<experiment_name>/web page/src/index.js`):

```javascript
import pushkinClient from "pushkin-client";
const pushkin = new pushkinClient();
```

The module has the following methods:

## connect

**Arguments:**

- **API URL:** string

  Location of this experiment’s API endpoint.

**Returns:** Promise. Resolves on successful connection.

## loadScript

**Arguments:**

- **URL:** string

  URL of a script to load.

**Returns:** Promise. Resolves upon successfully loading the script.

Scripts are reloaded if already present in the DOM, making sure they run again if a page changes.

## loadScripts

**Arguments:**

- **URLs:** string array

  URLs to load.

**Returns:** Promise. Resolves upon successfully loading all scripts.

A convenience function. Uses `loadScript` and `Promise.all` on the backend.

## prepExperimentRun

**Arguments:** None

**Returns:** Promise. Resolves upon affirmation.

Sends a POST request to `<exp_api>/startExperiment` to allow the backend to prepare stimuli for the experiment, if need be. Depends on defaults being enabled in the experiment’s API and worker.

## getAllStimuli

**Arguments:** None

**Returns:** Promise. Resolves to an array of jsPsych stimuli.

Obtains the stimuli for this experiment in one request. Depends on defaults being enabled in the experiment’s API and worker.

## saveStimulusResponse

**Arguments:**

- **jsPych data object:** { user_id : int, … }

  Data to be saved in the database under `user_id`. Posted to `<exp_api>/stimulusResponse`.

**Returns:** Promise. Resolves upon successful database save.

The function `setSaveAfterEachStimulus` is now deprecated, so `saveStimulusResponse` is called at the `on_data_update` event which happens at the end of every jsPsych trial after the `on_finish` (trial) and `on_trial_finish` events. The function is added as a parameter when initializing jsPsych in `experiments/<experiment_name>/web page/src/index.js` like so:

```js
const jsPsych = initJsPsych({
  ...,
  on_data_update: (data) => pushkin.saveStimulusResponse(data),
});
```

## insertMetaResponse

**Arguments:**

- **jsPych data object:** { user_id : int, … }

**Returns:** Promise. Resolves on successful connection.

## endExperiment

**Arguments:** None

**Returns:** Promise. Resolves upon successfully notifying the worker.

Notify the worker that the experiment has ended and that it can stop preparing for future stimuli. This should probably be called whenever the user leaves a page in the middle of an experiment as well.

## customApiCall

**Arguments:**

- **path:** string

  URL of API endpoint to send this call to.

- **data:** object

  Data to send to the API endpoint.

- **httpMethod:** string (optional)

  A lowercase string of an HTTP method to call the endpoint, such as “get” or “put”.

**Returns:** Promise. Resolves with response data.

Simplifies calls to custom API endpoints.
