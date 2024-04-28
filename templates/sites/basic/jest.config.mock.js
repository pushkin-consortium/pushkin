const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    "../../config(?:/.*)?(?:\\.js)?$": "<rootDir>/src/__mocks__/config.js",
    "../../experiments(\\.js)?$": "<rootDir>/src/__mocks__/experiments.js",
  }
};
