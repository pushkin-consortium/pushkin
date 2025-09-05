// Mock config file

// Front-end configuration file

// --- API ---
let apiEndpoint; 
let frontEndURL; 
let logoutURL; 

const rootDomain = 'http://localhost';
apiEndpoint = rootDomain + '/api';
frontEndURL = rootDomain + '/callback';
logoutURL = rootDomain;

export const CONFIG = {
  production: false,
  debug: false,

  apiEndpoint: apiEndpoint,
  frontEndURL: frontEndURL,
  logoutURL: logoutURL,

  useForum: false,
  useAuth: false,

  whoAmI: 'test config',
  hashtags: 'science, learn',
  email: 'test@email.com',
  shortName: 'test',
  salt: 'abc123',

  fc: null,
  authClientID: '',
  authDomain: ''
};
