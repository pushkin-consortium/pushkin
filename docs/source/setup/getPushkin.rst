.. _get-pushkin:

Starting a Pushkin Project
############

To start a new Pushkin website, you can install everything you need through the node project manager (npm). You will need to `install Node.js and npm <https://www.npmjs.com/get-npm>`.

FUBAR - UPDATE FOLLOWING

You will then need to set up the CLT. To do that, after you have cloned pushkin, move to pushkin's root directory and run:

```
$ chmod +x pushkin_installCLT.sh
$ ./pushkin_installCLT.sh
```

This will also install the pushkin developer tools.

.. note:: These docs assume that the  command 'pushkin' points to the CLT. If you choose not to do this, be aware that most of the docs will not work.

Pushkin relies on the following programs, which can easily be installed with Homebrew - if you're on a Mac - or another package manager:
- node
- npm
- envsubst

Once these are installed, run ``pushkin init`` to automated installing packages and setting up the Pushkin environment.

Once you've got Pushkin downloaded and installed, see :ref:`new-quiz` to make a quiz.

END FUBAR

Updating Pushkin
############

FUBAR


Pushkin Development
############


We don't recommend editing core Pushkin code locally, since this will make it difficult to update your distribution of Pushkin to take advantage of security patches, bug fixes, or new features. Instead, we recommend you fork the repository for the Pushkin tool in question. You can make a private npm package based on that repository. (If your changes are ones that others might want to make sure of as well, please submit a pull request!)

The main Pushkin repositories are:
`pushkin-client` <https://github.com/pushkin-consortium/pushkin-client>`
-----------
A module that wraps around local-axios and provides simplified methods for making calls to a Pushkin API. Note that these built-in requests assume the API has default routes enabled. Documentation for the Pushkin Client is currently absent, however the experiment template available via the generate command from the CLI provides a showing of almost all the features in action.

`pushkin-api` <https://github.com/pushkin-consortium/pushkin-api>`
-----------
Essentially a mini-server designed mainly with the use case of interfacing with Pushkin Client and Pushkin Worker. Once again, documentation is absent, but there is an example.

`pushkin-worker` <https://github.com/pushkin-consortium/pushkin-worker>`
-----------
Installable via NPM. Adds a "pushkin" command to the path. No documentation available yet

`pushkin-cli` <https://github.com/pushkin-consortium/pushkin-cli>`
-----------
Receives messages from RabbitMQ and runs whatever functionality it's told to run, sending the result back through the queue it came from. Designed to be on the receiving end of a Pushkin API. Comes with built-in simple functions that most users will probably want, like "getAllStimuli". Currently no explicit documentation, just an example.

`pushkin-jspsych` <https://github.com/pushkin-consortium/pushkin-jspsych>`
-----------
The Pushkin fork of JSPsych makes a few small changes to the real JSPsych so that it can be bundled together as if it's an NPM module. In order for it to be globally accessible to plugins as they expect, the import must be assigned to window.jsPsych. No documentation, present in example.