# Testing Pushkin with Jest

The content on this page may be out of date - stay tuned for edits!

[Jest](https://jestjs.io/en/) is a JavaScript library for creating, running, and structuring tests.

Install Jest using `yarn`:

```bash
$ yarn add --dev jest
```

To use Babel, install required dependencies via `yarn`:

```bash
$ yarn add --dev babel-jest @babel/core @babel/preset-env
```

Configure Babel to target your current version of Node by creating a `babel.config.js` file in the root of your project:

```javascript
// babel.config.js
 module.exports = {
     presets: [
         [
             '@babel/preset-env',
             {
                 targets: {
                     node: 'current',
                 },
             },
         ],
     ],
 };
```

The ideal configuration for Babel will depend on your project. See [Babel’s docs](https://babeljs.io/docs/en/) for more details.

To learn more about testing, go to [Jest official documentation](https://jestjs.io/docs/en/getting-started).

