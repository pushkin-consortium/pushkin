const { codespaces, codespaceName } = require('./src/.env.js');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const maybe_modify_test = test => {
  const test_str = test.toString();
  if(test_str.includes("js")) {
    return new RegExp(test_str.substring(1, 4) + 'cjs|' + test_str.substring(4, test_str.length - 1));
  } else {
    return test;
  }
};

module.exports = {
  devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
    if (codespaces) {
      // If testing with Codespaces, the WebSocket URL needs to be updated
      const webSocketURL = "wss://" + codespaceName + "-80.app.github.dev/ws";
      devServerConfig.client.webSocketURL = webSocketURL;
    }
    return devServerConfig;
  },
  webpack: {
    plugins: {
      add: [
        new NodePolyfillPlugin({
          excludeAliases: ['console'],
        }),
      ]
    },
    configure: (webpackConfig, {env, paths}) => {

      webpackConfig.module.rules.map(rule => {
        if(rule.test != undefined) {
          rule.test = maybe_modify_test(rule.test);
        } else {
          if(rule.oneOf != undefined) {
            rule.oneOf.map(r => {
              if(r.test != undefined) {
                r.test = maybe_modify_test(r.test);
              }
              return r;
            });
          }
        }
      
        return rule;
      });

      return webpackConfig
    }
  },
};
