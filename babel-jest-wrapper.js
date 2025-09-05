// https://babeljs.io/docs/config-files#jest
module.exports = require("babel-jest").default.createTransformer({
  rootMode: "upward",
});
