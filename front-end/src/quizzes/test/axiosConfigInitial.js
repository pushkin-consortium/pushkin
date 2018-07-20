import Axios from 'axios';

const axiosListenerQuiz = Axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? '/api/'.concat(QUIZ_NAME)
      : '//localhost/api/'.concat(QUIZ_NAME)
});

module.exports = axios;
