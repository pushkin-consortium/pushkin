module.exports = {
  transform: {
    "^.+\\.[t|j]sx?$": "../../babel-jest-wrapper.js",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(axios)/)",
    "/node_modules/(?!(core-js)/)",
    "\\.pnp\\.[^\\/]+$",
  ],
  testPathIgnorePatterns: ["/build/"],
};
