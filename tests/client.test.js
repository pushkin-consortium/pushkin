import axios from 'axios';
import Pushkin from '../src/index';

jest.mock('axios');

const pushkinClient = new Pushkin();

const quizURL = './api/quiz';
axios.create.mockResolvedValue(quizURL);
pushkinClient.connect('./api/quiz');

test('check if the constructor was called', () => {
  console.log(pushkinClient);
  return pushkinClient.con.then((data) => expect(data).toEqual(quizURL));
});
