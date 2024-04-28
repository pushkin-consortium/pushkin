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
    moduleFileExtensions: [
      "js",
      "jsx",
      "json",
      "node"
    ],
    moduleNameMapper: {
      "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/src/__mocks__/fileMock.js",
      "\\.(css|less|scss|sass)$": "identity-obj-proxy",
      "^axios$": "<rootDir>/__mocks__/axios.js"
    },
    testPathIgnorePatterns: [
      "/node_modules/",
      "/public/"
    ],
    transformIgnorePatterns: [
      "<rootDir>/node_modules/"
    ]
  };
  