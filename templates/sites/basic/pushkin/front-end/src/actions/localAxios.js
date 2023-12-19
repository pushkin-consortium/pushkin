import Axios from 'axios';

const local = Axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : '//localhost/api'
});

export default local;
