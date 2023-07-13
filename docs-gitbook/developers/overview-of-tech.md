# Overview of Technologies

## Front-end

* **HTML** - A basic building block of websites, most HTML in the Pushkin site lives in conjunction with React tags.
* **CSS** - How stylings for websites are often declared. Pushkin currently uses a combination of CSS and JS to set the stylings.
* **JavaScript** - A basic building block for website functionality. JavaScript is crucial to the Pushkin structure and is the basis of many of the other building blocks, such as React and Node.
* **React** - A JavaScript-based library for building interactive user interfaces and Single-Page Applications (SPA)
* **React-Router** - Handles navigation components for setting your page URLs in your SPA.
* **Aphrodite** - Adds JavaScript-based styling (to update CSS) for React components. Currently, this is used to customize hover styling for the QUizTile icons and buttons but can be imported into other components to add more control over the styling via JavaScript.
* **Redux** - State container for JS Apps. In the case of Pushkin, we use React-Redux to track state changes within the Pushkin SPA)
* **Bootstrap** - A framework for building responsive websites that adapt across devices. This includes features like navigation bars and buttons that easily adapt to different window dimensions. In the case of Pushkin, we use React-Bootstrap, which integrates Bootstrap styling into the React SPA.

## Back-end and Databases

* **Node** - The language of the backend. This is used to set up the APIs, set up the server for the site, and more.
* **SQL** - Used to manage the site databases, such as user information and experiment data. Pushkin is designed to use PostgreSQL.
* **Knex** - A SQL query builder for building, updating, and interacting with the database(s).
* **RabbitMQ** - A message broker for validation and routing. Routes messages from the API controller for the worker to receive.

## Other
* **Docker** - A platform for developing, shipping, and running applications. Used for running locally and deploying.
* **Babel** - This compiles the JavaScript used in the Pushkin project to ensure browser compatibility. This means having the ability to use modern JavaScript without losing accessibility for visitors on older browsers.
* **Auth0** - The service used for authorization to enable logins for site visitors.
* **Jest** - JavaScript testing framework - this dependency is built into Pushkin for users to build their own site testing.
