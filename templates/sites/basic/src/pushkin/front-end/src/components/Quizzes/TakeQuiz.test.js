import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import TakeQuiz from './TakeQuiz';
import mockExperiments from '../../../../../__mocks__/experiments'

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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Try and render each experiment 
  mockExperiments.forEach((experiment) => {
    it(`renders the quiz component for the "${experiment.fullName}" experiment`, () => {
      require('react-router-dom').useParams.mockReturnValue({ quizName: experiment.shortName });
      render(
        <Provider store={store}>
          <MemoryRouter>
            <TakeQuiz />
          </MemoryRouter>
        </Provider>
      );

      // Look for some standard things across quizzes 
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(document.getElementById('jsPsychTarget')).toBeInTheDocument();

      // Additional checks can be made here 
    });
  });
});
