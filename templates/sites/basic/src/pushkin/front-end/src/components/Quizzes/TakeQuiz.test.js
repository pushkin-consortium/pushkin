import React from 'react';
import { render, screen, act } from '@testing-library/react'; // Import act from testing-library
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import TakeQuiz from './TakeQuiz';
import experiments from '../../../../../__mocks__/experiments';
import axios from 'axios';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn()
}));

jest.mock('react-redux', () => ({
  connect: () => (component) => component,
  Provider: ({ children }) => <div>{children}</div>
}));

describe('TakeQuiz Component', () => {
  const mockStore = configureStore();
  let store;

  beforeEach(() => {
    store = mockStore({
      userInfo: {
        userID: '123'
      }
    });
    axios.post.mockResolvedValue({ data: {} }); // Mocking Axios post request
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  experiments.forEach((experiment) => {
    it(`renders the quiz component for the "${experiment.fullName}" experiment`, async () => {
      await act(async () => { // Use async and await inside act for rendering and state updates
        require('react-router-dom').useParams.mockReturnValue({ quizName: experiment.shortName });
        render(
          <Provider store={store}>
            <MemoryRouter>
              <TakeQuiz />
            </MemoryRouter>
          </Provider>
        );
      });

      // Assertions can now be done after the async operations have resolved
      expect(document.getElementById('jsPsychTarget')).toBeInTheDocument();
    });
  });
});
