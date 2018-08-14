.. _get-pushkin:

Get Pushkin
=========================

Clone the latest version of Pushkin from GitHub::

  git clone https://github.com/l3atbc-datadog/pushkin.git

To make Pushkin's CLT as easy to use as it can be, we recommend adding an alias to your bash profile. Simply run the following command from your Pushkin project folder root to do this::

  echo "alias pushkin=\"$PWD\"/.pushkin/pushkin" >> ~/.bash_profile

If you know what you're doing, you can optionally add the same location to your ``$PATH`` as well, thus allowing other scripts to run pushkin commands.

.. note:: These docs assume that at least one of the above steps have been taken and the command 'pushkin' points to the CLT. If you choose not to do this, be aware that most of the docs will not work.

Pushkin relies on the following programs, which can easily be installed with Homebrew - if you're on a Mac - or another package manager:
- node
- npm
- envsubst

Once these are installed, run ``pushkin init`` to automated installing packages and setting up the Pushkin environment.

Once you've got Pushkin downloaded and installed, see :ref:`new-quiz` to make a quiz.
