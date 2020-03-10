import axios from 'axios';
import Pushkin from '../src/index';

// in order to test this method without actually hitting the API (creating slow and fragile tests),
// we can use the jest.mock(...) function to automatically mock the axios module.
jest.mock('axios');

const quizURL = './api/quiz';
axios.create.mockResolvedValue(quizURL);
// or you could use the following depending on your use case:
// axios.get.mockImplementation(() => Promise.resolve(quizURL))

const pushkinClient = new Pushkin();
pushkinClient.connect(quizURL);

test('connect to quiz api url', () => {
  // Pushkin { con: Promise { './api/quiz' } }
  pushkinClient.con.then((data) => expect(data).toEqual(quizURL));
});

test('load script url', () => {
  const testURL = 'test';
  pushkinClient.loadScript(testURL).then((data) => expect(data).toEqual(testURL));
})

test('load multiple script urls', () => {
  const testURLs = ['test1', 'test2', 'test3'];
  pushkinClient.loadScripts(testURLs).then((data) => expect(data).toEqual(testURLs));
})
