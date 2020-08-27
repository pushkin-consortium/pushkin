// Global configuration file

import util from 'util';
import jsYaml from 'js-yaml';
import fs from 'fs';
import { pushkinConfig } from './.pushkin.js'
import { debug } from './.env.js'

// Front-end configuration file

// --- API ---
let apiEndpoint; //Still needed?
let frontEndURL; //Still needed?
let logoutURL; //Still needed?
if (debug) {
  // Debug / Test
  const rootDomain = 'http://localhost';
  apiEndpoint = rootDomain + '/api';
  frontEndURL = rootDomain + '/callback';
  logoutURL = rootDomain;
} else {
  // Production
  const rootDomain = pushkinConfig.info.rootDomain;
  if (pushkinConfig.apiEndpoint) {
    //What's in the YAML can override default
    apiEndpoint = pushkinConfig.apiEndpoint
  } else{
    apiEndpoint = 'https://api.' + rootDomain;    
  }
  frontEndURL = 'https://' + rootDomain + '/callback';
  logoutURL = 'https://' + rootDomain;
}

export const CONFIG = {
  production: !debug,
  debug: debug,

  apiEndpoint: apiEndpoint,
  frontEndURL: frontEndURL,
  logoutURL: logoutURL,

  useForum: pushkinConfig.addons.useForum,
  useAuth: pushkinConfig.addons.useAuth,

  whoAmI: pushkinConfig.info.whoAmI,
  hashtags: pushkinConfig.info.hashtags,
  email: pushkinConfig.info.email,
  shortName: pushkinConfig.info.shortName,
  salt: pushkinConfig.salt,

  fc: pushkinConfig.fc,
  authClientID: '',
  authDomain: ''
};
