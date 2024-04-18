const babelParser = require("@babel/eslint-parser");
const babelPlugin = require("@babel/eslint-plugin");
// This plugin should be used by virtue of `plugins: ["@babel"]` below
const globals = require("globals");
const js = require("@eslint/js");
const pluginPrettierRecommended = require("eslint-plugin-prettier/recommended");
/* eslint-disable-next-line no-unused-vars */
const eslintPluginOnlyWarn = require("eslint-plugin-only-warn");
// Use the above temporarily while we're sorting out our eslint config
// eslintPluginOnlyWarn is a plugin that sets all rules to "warn" instead of "error"
// It's active in the config without the var being used, hence the eslint-disable-next-line

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      sourceType: "commonjs",
    },
  },
  {
    // This is definitely wrong, but a stopgap until I figure out Babel issues
    files: ["packages/pushkin-cli/src/**/*.js"],
    plugins: {
      "@babel": babelPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          rootMode: "upward",
        },
      },
      sourceType: "module",
    },
    rules: {
      "@babel/new-cap": "error",
      "@babel/no-invalid-this": "error",
      "@babel/no-undef": "error",
      "@babel/no-unused-expressions": "error",
      "@babel/object-curly-spacing": "error",
      "@babel/semi": "error",
    },
  },
  // Any other config imports go above
  pluginPrettierRecommended,
];

// Old config from pushkin-cli (.eslintrc.json) for reference
// {
//   "env": {
//       "browser": true,
//       "es6": true
//   },
//   "extends": [
//       "airbnb-base"
//   ],
//   "globals": {
//       "Atomics": "readonly",
//       "SharedArrayBuffer": "readonly"
//   },
//   "parserOptions": {
//       "ecmaVersion": 2018,
//       "sourceType": "module"
//   },
//   "rules": {
//   }
// }
