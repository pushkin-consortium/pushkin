import axios from 'axios';
import Pushkin from '../src/index';

const pushkinClient = new Pushkin();

jest.mock('axios');

test('connect to quiz api url', () => {
  const quizURL = 'api/quiz';
  const create = axios.create.mockImplementation(() => axios);

  pushkinClient.connect(quizURL);

  expect(create).toHaveBeenCalledTimes(1);
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
  const test_stimuli = [
    { stimulus: 'img/blue.png' },
    { stimulus: 'img/orange.png' },
  ];

  const postData = {
    user_id: 123456,
    data_string: [1, 'a', '2c'],
    stimulus: { A: [2, 'b', '3d'] },
  };

  pushkinClient.setSaveAfterEachStimulus(test_stimuli)[0].on_finish(test_stimuli).then((data) => expect(data).toEqual(postData));
});

test('insert meta response', () => {
  // ReferenceError: stimulus is not defined
  const postData = {
    user_id: 123456,
    data_string: [1, 'a', '2c'],
    stimulus: { A: [2, 'b', '3d'] },
  };

  axios.post.mockImplementation(() => Promise.resolve(postData));

  pushkinClient.insertMetaResponse(postData).then((data) => expect(data).toEqual(postData));
});

test('end experiment', () => {
  const postData = {
    user_id: 123456,
  };

  axios.post.mockImplementation(() => Promise.resolve(postData));

  pushkinClient.endExperiment(postData).then((data) => expect(data).toEqual(postData));
});

test.skip('custom API call', () => {
  // TO DO
});
