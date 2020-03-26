.. _development_prep:

The pushkin prep command
=========================

In order to simplify maintaining a Pushkin website, all code for a single experiment is kept in a folder in the ``experiments`` directory. For production, various bits of code need to go different places. ``Pushkin prep`` puts those files and information where they need to go. It also simplifies removing an experiment. When you don't want an experiment on the website anymore, simply delete its folder from the ``experiments`` directory and redeploy.

The code for ``prep`` can be found in ``pushkin-cli/src/commands/prep/index.js``. There is inline documentation. Below, we provide an overview of what ``prep`` does.

1. Prep deletes the ``experiments.js`` and ``controllers.json`` files (see website_controlersJSON_ and website_experimentsJS_). It deletes temporary files stored in ``api`` and ``front-end``. It also removes the experiment workers from the core ``docker-compose.dev.yml``.

2. ``npm pack`` is used to turn each API controller into a tarball. Those tarballs are stored in ``api/tempPackages``. The names of these controllers are added to ``controllers.json``.

3. ``npm pack`` is used to turn each experiment into a tarball. Those tarballs are stored in ``front-end/tempPackages``. The names of the experiments are added to ``experiments.js``.

4. ``docker build`` is used to build an image for each experiment's workers. These are added to the core ``docker-compose.dev.yml``.

.. include:: ../links/links.rst
