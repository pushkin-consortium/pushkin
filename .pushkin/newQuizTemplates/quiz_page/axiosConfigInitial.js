import Axios from 'axios';

export default Axios.create({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? '/api/${QUIZ_NAME}'
      : '//localhost/api/${QUIZ_NAME}'
});
