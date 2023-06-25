# Getting Started on Development

## Understanding the Front End

1. Basics. You’ll want a reasonably thorough grounding in Javascript and React. The tutorials in Code Academy are pretty good, though not free.
2. Pushkin is a Single Page Application \(SPA\) based on React. For a gentle introduction to this stack, read this [tutorial](https://auth0.com/blog/beyond-create-react-app-react-router-redux-saga-and-more/#Securing-Your-React-Application), which also describes incorporating authentication with auth0. Note that this tutorial is slightly out of date in that auth0 now uses auth0-spa-js for SPAs, and create-react-app suggests using function components rather than class components.
3. To fill in your understanding of React, we recommend the two-part Codecademy.com [Learn ReactJS](https://www.codecademy.com/learn/react-101) course.
4. Next, you probably want to learn more about routing using React-Router. We use [v5](https://reacttraining.com/blog/react-router-v5/), which is nearly identical to v4. If you read up on React Router, you’ll see a lot of [discussion of dynamic routing](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/guides/philosophy.md), though you can probably safely ignore this. One of the better tutorials available is [here](https://auth0.com/blog/react-router-4-practical-tutorial/), though it’s a bit short.
5. You’ll also want to understand Redux better. Redux is used to keep track of application-level state variables. For Pushkin, a primary usecase is keeping track of subject IDs. The best tutorial we’ve found for React-Redux is [the official one](https://redux.js.org/basics/basic-tutorial). Note that it’s a little out-of-date with regards to use of object spread syntax \(which is now supported by Node\) and with how to handle asynchronous requests: we’ll be using [redux sagas](https://redux-saga.js.org/docs/introduction/) for that, so read up on that as well. A good place to start on why redux sagas are worth using is [here](https://engineering.universe.com/what-is-redux-saga-c1252fc2f4d1).
6. At this point, we recommend going back through the tutorial in \#2 above.

## Understanding Docker

There are a number of tutorials on Docker. For ongoing use, this [cheatsheet](https://www.digitalocean.com/community/tutorials/how-to-remove-docker-images-containers-and-volumes) is pretty useful.

## Testing Pushkin Modules Locally

### Using Jest tests
For information on running tests with Jest, see [Testing Pushkin with Jest](https://languagelearninglab.gitbook.io/pushkin/advanced/testing-pushkin-with-jest)

The content on this page may be out of date - stay tuned for edits!

Currently, the most convenient way to test new version of Pushkin modules locally is getting the tarball of the pushkin modules you modified and putting it into the node test project folder.

1. If you have a node project for test the new version of Pushkin modules \(pushkin-api, pushkin-client, pushkin-worker, etc.\), create a folder in the project dir named “testPackages”.
2. Get the tarball of the pushkin modules to be tested, like “pushkin-api-1.2.0.tgz”. Put this tarball into the testPackages folder.
3. Modify the package.json file in the project dir like this:

```javascript
"dependencies": {
    "pushkin-api": "file:testPackages/pushkin-api-1.2.0.tgz",
    ... ...
    }
```

That is, modify the path of the Pushkin module to the local test version, so that Yarn will find it locally rather than in the npm repository.

After you `yarn add` all of the dependencies, you can write the test codes.

### npm link for pushkin-worker, pushkin-api, and pushkin-client

If you are working on any of the utility packages (pushkin-worker, pushkin-api, pushkin-client), trying out your new code is not straightforward. These packages are included into the experiments and sites via npm. Normally, that means you can only include published versions. You can get around this using [`npm link`](https://docs.npmjs.com/cli/v9/commands/npm-link?v=true#description). In addition to the official npm documentation, there are plenty of useful discussions online.

## Pushkin jsPsych

A slightly-modified version of the core [jsPsych](https://github.com/jspsych/jsPsych) script available on NPM under `pushkin-jspsych`.

Global variables are removed and what would normally have been assigned to window.jsPsych is exported as the default export. It has all the same properties. It should be assigned to the window object by the page using it, like so:

```text
import jsPsych from 'pushkin-jspsych';
window.jsPsych = jsPsych;
```

This prevents conflicts when multiple pages are using different versions of jsPsych. It also allows plugins to be used without any modification needed to suit this version.

