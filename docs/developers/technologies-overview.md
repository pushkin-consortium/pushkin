# Overview of technologies

Below is a non-exhaustive list of technologies in the Pushkin stack. Depending on what you're trying to develop, some of these may be absolutely essential or less important. In some cases, we suggest learning resources. If you find other resources that are particularly helpful, please make a pull request to update this page!

## Front-end

- **HTML:** A basic building block of websites, most HTML in a Pushkin site lives in conjunction with React tags.
- **CSS:** How stylings for websites are often declared. Pushkin currently uses a combination of CSS and JS to set the stylings.
- **React:** A JavaScript library for building interactive user interfaces and single-page applications (SPAs). Pushkin creates your site as an SPA using React.
    - You’ll want a reasonably thorough grounding in Javascript and React (especially important for working with site templates). We recommend the Codecademy.com [Learn React](https://www.codecademy.com/learn/react-101) course.
    - For a gentle introduction to SPAs, read this [tutorial](https://auth0.com/blog/beyond-create-react-app-react-router-redux-saga-and-more/), which also describes incorporating authentication with Auth0. Note that this tutorial is slightly out of date in that Auth0 now uses auth0-spa-js for SPAs, and create-react-app suggests using function components rather than class components.
- **React-Router:** Handles navigation components for setting your page URLs in your SPA.
    - To work with site templates, you probably want to learn more about routing using React-Router. We use [v5](https://reacttraining.com/blog/react-router-v5/), which is nearly identical to v4. If you read up on React Router, you’ll see a lot of [discussion of dynamic routing](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/guides/philosophy.md), though you can probably safely ignore this. One of the better tutorials available is [here](https://auth0.com/blog/react-router-4-practical-tutorial/), though it’s a bit short.
- **Redux:** Redux is used to keep track of application-level state variables. In the case of Pushkin, we use React-Redux. A primary use case is keeping track of subject IDs.
    - The best tutorial we’ve found for React-Redux is [the official one](https://redux.js.org/basics/basic-tutorial). Note that it’s a little out-of-date with regards to the use of object spread syntax (which is now supported by Node) and with how to handle asynchronous requests, for which we use [redux sagas](https://redux-saga.js.org/docs/introduction/). A good place to start on why redux sagas are worth using is [here](https://engineering.universe.com/what-is-redux-saga-c1252fc2f4d1).
- **jsPsych:** jsPsych creates the experiments themselves within the Pushkin site and collects participants' data.
    - A solid grasp of jsPsych is essential for developing experiment templates. We recommend consulting their [documentation](https://www.jspsych.org).
- **Bootstrap:** A framework for building responsive websites that adapt across devices. This includes features like navigation bars and buttons that easily adapt to different window dimensions. In the case of Pushkin, we use React-Bootstrap, which integrates Bootstrap styling into the React SPA.
- **Aphrodite:** Adds JavaScript-based styling (to update CSS) for React components. Currently, this is used to customize hover styling for the QuizTile icons and buttons but can be imported into other components to add more control over the styling via JavaScript.

## Back-end and database

- **Node:** The language of the back end. This is used to set up the APIs, set up the server for the site, and more.
    - You’ll need a decent understanding of Javascript and Node for doing development on the Pushkin CLI.
- **SQL:** Used to manage the site databases, such as user information and experiment data. Pushkin is designed to use PostgreSQL.
- **Knex:** A SQL query builder for building, updating, and interacting with Pushkin databases.
- **RabbitMQ:** A message broker for validation and routing. Routes messages from the API controller for the worker to receive.

## Other
- **Docker:** A platform for developing, shipping, and running applications. Used for testing your Pushkin site locally and deploying it.
    - There are a number of tutorials out there on Docker. For ongoing use, this [cheatsheet](https://www.digitalocean.com/community/tutorials/how-to-remove-docker-images-containers-and-volumes) is pretty useful.
- **Babel:** Compiles the JavaScript used in the Pushkin project to ensure browser compatibility. This means having the ability to use modern JavaScript without losing accessibility for visitors on older browsers.
- **Auth0:** The service used for authorization to enable logins for site visitors.
- **Jest:** A JavaScript testing framework. The Pushkin team uses Jest in development of Pushkin packages and templates, but users can also add it to their Pushkin sites and develop their own tests.
- **Playwright:** A tool for end-to-end testing, i.e. testing the site as a whole, including the front end, back end, and database. Pushkin sites come set up to run end-to-end tests using [Playwright](https://playwright.dev/). Pushkin developers also run end-to-end tests as an additional layer of testing for contributions.
