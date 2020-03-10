import axios from 'axios';
import Pushkin from '../src/index';

// in order to test this method without actually hitting the API (creating slow and fragile tests),
// we can use the jest.mock(...) function to automatically mock the axios module.
jest.mock('axios');

const pushkinClient = new Pushkin();

const quizURL = './api/quiz';
axios.create.mockResolvedValue(quizURL);
// or you could use the following depending on your use case:
// axios.get.mockImplementation(() => Promise.resolve(quizURL))

pushkinClient.connect(quizURL);

test('should connect to quiz api url', () => {
  // Pushkin { con: Promise { './api/quiz' } }
  return pushkinClient.con.then((data) => expect(data).toEqual(quizURL));
});

