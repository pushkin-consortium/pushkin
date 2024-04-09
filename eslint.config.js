const eslintPluginPrettierRecommended = require("eslint-plugin-prettier/recommended");
const eslintJS = require("@eslint/js");

module.exports = [
  eslintJS.configs.recommended,
  {
    languageOptions: {
      sourceType: "commonjs",
    },
  },
  // Any other config imports go at the top
  eslintPluginPrettierRecommended,
];
