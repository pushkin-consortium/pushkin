import Axios from 'axios';

const axiosBloodmagic = Axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? '/api/bloodmagic'
      : '//localhost/api/bloodmagic'
});

module.exports = axiosBloodmagic;
