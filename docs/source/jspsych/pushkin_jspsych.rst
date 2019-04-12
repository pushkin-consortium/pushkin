.. _pushkin_jspsych:

Pushkin JSPsych
================
A slightly-modified version of the core `jsPsych <https://github.com/jspsych/jsPsych>`_ script available on NPM under ``pushkin-jspsych``.

Global variables are removed and what would normally have been assigned to window.jsPsych is exported as the default export. It has all the same properties. It should be assigned to the window object by the page using it, like so::

   import jsPsych from 'pushkin-jspsych';
   window.jsPsych = jsPsych;

This prevents conflicts when mutliple pages are using different versions of jsPsych. It also allows plugins to be used without any modification needed to suit this version.
