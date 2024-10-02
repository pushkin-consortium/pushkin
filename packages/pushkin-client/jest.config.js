module.exports = {
  transform: {
    "^.+\\.[t|j]sx?$": "../../babel-jest-wrapper.js",
  },
  transformIgnorePatterns: ["/node_modules/(?!(axios)/)", "\\.pnp\\.[^\\/]+$"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/build/"],
};
