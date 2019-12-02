.. _development_experimentStubs:

Note: This will need to be updated once we have more than one stub experiment type.

Stub experiment
----------------------

``pushkin generate newExp`` will generate a new stub experiment called ``newExp``. It does this by running ``index.js`` in 

::

   └── pushkin-cli
      └── generate

This begins by copying the files in 

::

   └── pushkin-cli
      └── generate
         └── generateFiles

to your experiments folder. In the process, it renames any folders or files that need to be renamed to match the name of your experiment (in our example, `newExp`).

Then, it runs ``npm install`` in three directories: ``api controllers``, ``worker``, and ``web page``. The first two directories are essentially empty wrappers for a ``package.json``, which tells npm to download the latest versions of ``pushkin-api`` and ``pushkin-worker``, respectively. The final directory has some stub code for the experiment web page, plus a ``package.json`` requesting ``pushkin-client`` and the pushkin-compatible version of jsPsych (``pushkin-jspsych``).

There is one extra step for the worker, which is running ``npm run build``. This runs a script defined in the ``pushkin-worker`` package.json. This asks babel to compile the worker files into backwards compatible javascript. (Given that the worker is going to run on a Node server, this is probably not necessary.)

.. include:: ../links/links.rst
