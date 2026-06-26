module.exports = {
  transform: {
    "^.+\\.[t|j]sx?$": "../../babel-jest-wrapper.js",
  },
  transformIgnorePatterns: [
    "/node_modules/", // Don't transform anything in node_modules (including AWS SDK)
    "\\.pnp\\.[^\\/]+$",
  ],
  testPathIgnorePatterns: ["/build/"],
  testEnvironment: "node",
};
