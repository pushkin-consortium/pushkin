.. _get-pushkin:

Get Pushkin
=========================

To install Pushkin, you will need `wget`, which is easily installed using Homebrew or another package manager.

If you simply want to use Pushkin, you should visit https://github.com/pushkin-consortium/pushkin_quickinstall and follow the instructions. This will download everything you need and set up the Command Line Tools (CLT).

If you are planning on contributing to pushkin, clone (or better yet, fork) the version from GitHub::

  git clone https://github.com/l3atbc-datadog/pushkin.git

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
