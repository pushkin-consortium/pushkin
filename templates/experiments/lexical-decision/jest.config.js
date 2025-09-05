module.exports = {
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/build/", "/e2e/"],
  transform: {
    "^.+\\.[t|j]sx?$": "../../../babel-jest-wrapper.js",
  },
};
