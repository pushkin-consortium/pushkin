.. _development:

Developing with Pushkin
####################

Pushkin is 100% open-source. We love it when people come together to help fix bugs, build features, and make Pushkin better for everyone. If you'd like to contribute, feel free to open a pull request. The Pushkin project is split into several repos, each corresponding to a an NPM module. Issues and general project direction is tracked via GitHub's project boards and issues. An example of all of them working together is available via the ``pushkin generate`` command. Below is a general overview.

1. `Client <https://github.com/pushkin-consortium/pushkin-client>`_ (:ref:`Docs <pushkin_client>`)
A module that provides simplified methods for making calls to a Pushkin API and unpacking data sent back from a worker. Note that built-in functions assume the API has corresponding default routes enabled to handle such requests.

2. `API <https://github.com/pushkin-consortium/pushkin_api>`_ (:ref:`Docs <pushkin_api>`)
Essentially a mini-server designed with the use case of interfacing between Pushkin Client and Pushkin Worker via RabbitMQ.

3. `CLI <https://github.com/pushkin-consortium/pushkin-cli>`_ (:ref:`Docs <pushkin_cli>`)
Installable via NPM. Adds a ``pushkin`` command to the path when installed globally and makes working with Pushkin much easier.

4. `Worker <https://github.com/pushkin-consortium/pushkin-worker/>`_ (:ref:`Docs <pushkin_worker>`)
Receives messages from RabbitMQ and runs whatever functionality it's told to run, sending the result back through the queue it came from. Designed to be on the receiving end of a Pushkin API. Comes with built-in simple functions that most users will probably want, like "getAllStimuli".

5. `JSPsych <https://github.com/pushkin-consortium/pushkin-jspsych/>`_ (:ref:`Docs <pushkin_jspsych>`)
The Pushkin JSPsych repo simply makes a few small changes to the official JSPsych library so that it can be bundled together as if it's an NPM module. In order for it to be globally accessible to plugins as they expect, the import must be assigned to window.jsPsych.

Getting Started on Development
####################

Understanding the Front End
----------------------

1. Basics. You'll want a reasonably thorough grounding in Javascript and React. The tutorials in Code Academy are pretty good, though not free.

2. Pushkin is a Single Page Application (SPA) based on React. For a gentle introduction to this stack, read this `tutorial <https://auth0.com/blog/beyond-create-react-app-react-router-redux-saga-and-more/#Securing-Your-React-Application>`_, which also describes incorporating authentication with auth0. Note that this tutorial is slightly out of date in that auth0 now uses auth0-spa-js for SPAs, and create-react-app suggests using function components rather than class components.

3. To fill in your understanding of React, we recommend the two-part Codecademy.com `Learn ReactJS <https://www.codecademy.com/learn/react-101>`_ course.

4. Next, you probably want to learn more about routing using React-Router. We use v5, which is nearly identical to `v4 <https://reacttraining.com/blog/react-router-v5/>`_. If you read up on React Router, you'll see a lot of `discussion of dynamic routing <https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/guides/philosophy.md>`_, though you can probably safely ignore this. One of the better tutorials available is `here <https://auth0.com/blog/react-router-4-practical-tutorial/>`_, though it's a bit short. 

5. You'll also want to understand Redux better. Redux is used to keep track of application-level state variables. For Pushkin, a primary usecase is keeping track of subject IDs. The best tutorial we've found for React-Redux is `the official one <https://redux.js.org/basics/basic-tutorial>`_. Note that it's a little out-of-date with regards to use of object spread syntax (which is now supported by Node) and with how to handle asynchronous requests: we'll be using `redux sagas <https://redux-saga.js.org/docs/introduction/>`_ for that, so read up on that as well. A good place to start on why redux sagas are worth using is `here <https://engineering.universe.com/what-is-redux-saga-c1252fc2f4d1>`_.

7. At this point, we recommend going back through the tutorial in #2 above.

Understanding Docker
--------------------

There are a number of tutorials on Docker. For ongoing use, this `cheatsheet <https://www.digitalocean.com/community/tutorials/how-to-remove-docker-images-containers-and-volumes>`_ is pretty useful.