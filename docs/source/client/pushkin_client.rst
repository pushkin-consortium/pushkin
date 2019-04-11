.. _pushkin_client:

Pushkin Client
===============
The Pushkin client is available on NPM under ``pushkin-client``. It should be instantiated once imported into a web page::

   import pushkinClient from 'pushkin-client';
   const pushkin = new pushkinClient();

The module has the following methods:

connect
---------
**Arguments:**
   - **API URL** : string

     Location of this experiment's API endpoint.

**Returns:** Promise. Resolves on successful connection.

------------

loadScript
-----------
**Arguments:**
   - **URL** : string

     URL of a script to load 

**Returns:** Promise. Resolves upon successfully loading the script.

Useful for loading external jsPsych plugins from a CDN. Scripts are reloaded if already present in the DOM, making sure they run again if a page changes.

------------

loadScripts
-------------
**Arguments:**
   - **URLs** : string array

      URLs to load.

**Returns:** Promise. Resolves upon successfully loading all scripts.

A convenience function. Uses loadScript and Promise.all in the backend.

------------

prepExperimentRun
-------------------
**Arguments:** None

**Returns:** Promise. Resolves upon affirmation.

Sends a POST request to [expapi]/startExperiment to allow the backend to prepare stimuli for the experiment, if need be. Depends on defaults being enable in the experiment's API and worker.

------------

getAllStimuli
-------------------
**Arguments:** None

**Returns:** Promise. Resolves to an array of jsPsych stimuli.

Obtains the stimuli for this experiment in one request. Depends on defaults being enable in the experiment's API and worker.

------------

setSaveAfterEachStimulus
-------------------------
**Arguments:**
   - **jsPsych stimuli** : object array

     Adds the on_finish property to each stimulus and sets it to call saveStimulusResponse.

**Returns:** Modified object array of jsPsych stimuli.

------------

saveStimulusResponse
---------------------
**Arguments:**
   - **** : type

     Description

**Returns:**

Description.

------------

endExperiment
-------------------
**Arguments:**
   - **** : type

     Description

**Returns:**

Description.

------------

customApiCall
-------------------
**Arguments:**
   - **** : type

     Description

**Returns:**

Description.
