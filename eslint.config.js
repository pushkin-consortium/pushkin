const babelParser = require("@babel/eslint-parser");
const babelPlugin = require("@babel/eslint-plugin");
const globals = require("globals");
const js = require("@eslint/js");
const prettierRecommended = require("eslint-plugin-prettier/recommended");
/* eslint-disable-next-line no-unused-vars */
const onlyWarn = require("eslint-plugin-only-warn");
// Use the above temporarily while we're sorting out our eslint config
// eslintPluginOnlyWarn is a plugin that sets all rules to "warn" instead of "error"
// It's active in the config without the var being used, hence the eslint-disable-next-line
const jsdoc = require("eslint-plugin-jsdoc");
const react = require("eslint-plugin-react");
const jest = require("eslint-plugin-jest");
const { fixupPluginRules } = require("@eslint/compat");

// const importPlugin = require("eslint-plugin-import");
// const reactRecommended = require("eslint-plugin-react/configs/recommended");
// Add the plugins above once they release support for eslint 9,
// and then we should be able to remove the fixupPluginRules function
// (see https://github.com/import-js/eslint-plugin-import/issues/2948
// and https://github.com/jsx-eslint/eslint-plugin-react/issues/3699)

// Monorepo-wide configs
const monorepoConfig = {
  ...js.configs.recommended,
  ...jsdoc.configs["flat/recommended"],
  ...jest.configs["flat/recommended"],
  languageOptions: {
    sourceType: "commonjs",
    globals: {
      ...globals.node,
      ...globals.jest,
    },
  },
  plugins: {
    jsdoc,
    jest,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...jsdoc.configs["flat/recommended"].rules,
    ...jest.configs["flat/recommended"].rules,
    "jsdoc/require-jsdoc": [
      "error",
      {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
      },
    ],
    "jsdoc/require-description": "error",
    "jsdoc/require-param": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-param-type": "error",
  },
};

// Config options for Babel-transpiled files
const babelConfig = {
  files: [
    "packages/*/src/**/*.js",
    "templates/sites/*/src/pushkin/*/src/**/*.js",
    "templates/experiments/*/src/*/src/**/*.js",],
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
};

const reactConfig = {
  files: [
    "templates/sites/*/src/pushkin/front-end/src/**/*.js",
    "templates/experiments/*/src/web page/src/**/*.js",
  ],
  languageOptions: {
    globals: {
      ...globals.browser,
    },
    parser: babelParser,
    parserOptions: {
      babelOptions: {
        presets: ["@babel/preset-env", "@babel/react"],
      },
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    react: fixupPluginRules(react),
  },
  rules: {
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};

module.exports = [
  monorepoConfig,
  babelConfig,
  reactConfig,
  // Any other config imports go above
  prettierRecommended,
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
