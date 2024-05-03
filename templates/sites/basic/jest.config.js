const fs = require('fs');

// These config properties must differ for running tests in the dev environment vs.
// running tests in the user's site after template installation.
let globalSetup
const moduleNameMapper = {
  "\\.(css|less|scss|sass)$": "identity-obj-proxy",
};

// If the pushkin.yaml file exists, we are in the user's site after template installation.
if (fs.existsSync('pushkin.yaml')) {
  Object.assign(moduleNameMapper, {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.js",
    "^axios$": "<rootDir>/__mocks__/axios.js"
  });
} else {
  globalSetup = "<rootDir>/preTest.js";
  Object.assign(moduleNameMapper, {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/src/__mocks__/fileMock.js",
    "^axios$": "<rootDir>/src/__mocks__/axios.js",
    "../../config(\\.js)?$": "<rootDir>/src/__mocks__/config.js",
    "experiments(\\.js)?$": "<rootDir>/src/__mocks__/experiments.js"
  });
}

module.exports = {
    testEnvironment: "jsdom",
    clearMocks: true,
    coveragePathIgnorePatterns: [
      "/node_modules/"
    ],
    coverageThreshold: {
      global: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50
      }
    },
    globalSetup: globalSetup,
    moduleFileExtensions: [
      "js",
      "jsx",
      "json",
      "node"
    ],
    moduleNameMapper: moduleNameMapper,
    testPathIgnorePatterns: [
      "/node_modules/",
      "/public/",
      ".*\\.yalc.*" 
    ],
    modulePathIgnorePatterns: [
      ".*\\.yalc.*" 
    ],
    transformIgnorePatterns: [
      "<rootDir>/node_modules/"
    ]
  };
  