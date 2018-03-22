import Axios from 'axios';

const axiosListenerQuiz = Axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? '/api/listener-quiz'
      : '//localhost/api/listener-quiz'
});

module.exports = axiosListenerQuiz;
