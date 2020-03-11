import axios from 'axios';
import Pushkin from '../src/index';

jest.mock('axios');

const pushkinClient = new Pushkin();

test('connect to quiz api url', () => {
  const quizURL = 'api/quiz';
  axios.create.mockImplementation(() => axios);
  pushkinClient.connect(quizURL);
});

test('load script url', () => {
  const testURL = '/testurl';
  pushkinClient.loadScript(testURL).then((data) => expect(data).toEqual(testURL));
});

test('load multiple script urls', () => {
  const testURLs = ['/testurl1', '/testurl2', '/testurl3'];
  pushkinClient.loadScripts(testURLs).then((data) => expect(data).toEqual(testURLs));
});

test('prepare for experiment', () => {
  const postData = { user_id: 123456 };
  axios.post.mockImplementation(() => Promise.resolve(postData));
  pushkinClient.prepExperimentRun(postData).then((data) => expect(data).toEqual(postData));
});

test('tabulate and post results', () => {
  const postData = {
    user_id: 123456,
    experiment: 'test experiment',
  };
  axios.post.mockImplementation(() => Promise.resolve(postData));
  pushkinClient.tabulateAndPostResults(postData).then((data) => expect(data).toEqual(postData));
});

test('get all stimuli', () => {
  const postData = {
    user_id: 123456,
    nItems: ['item1', 'item2', 3],
  };
  axios.post.mockImplementation(() => Promise.resolve(postData));
  pushkinClient.getAllStimuli(postData).then((data) => expect(data).toEqual(postData));
});

test('save stimulus response', () => {
  const postData = {
    user_id: 123456,
    data_string: [1, 'a', '2c'],
    stimulus: { A: [2, 'b', '3d'] },
  };
  axios.post.mockImplementation(() => Promise.resolve(postData));
  pushkinClient.saveStimulusResponse(postData).then((data) => expect(data).toEqual(postData));
});

test('set save after each stimulus', () => {
  // TO DO
});

test('insert meta response', () => {
  // ReferenceError: stimulus is not defined
});

test('end experiment', () => {
  const postData = {
    user_id: 123456,
  };
  axios.post.mockImplementation(() => Promise.resolve(postData));
  pushkinClient.endExperiment(postData).then((data) => expect(data).toEqual(postData));
});

test('custom API call', () => {
  const postData = {
    user_id: 123456,
    data_string: [1, 'a', '2c'],
    stimulus: { A: [2, 'b', '3d'] },
  };
  axios.post.mockImplementation(() => Promise.resolve(postData));
  pushkinClient.customApiCall('./custom/api/url', postData, 'post').then((data) => expect(data).toEqual(postData));
});
