import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import TakeQuiz from './TakeQuiz';
import mockExperiments from '../../../../../__mocks__/experiments.mjs';

console.log('mockExperiments:', mockExperiments);

// Mock the experiments.js using your actual mock data
jest.mock('../../experiments.js', () => {
  console.log(mockExperiments)
  return mockExperiments; // Return the mockExperiments array directly as the default export
});


// Ensure that the CONFIG from the mock file is being used throughout the test
jest.mock('../../config', () => ({
  CONFIG: require('../../../../../__mocks__/config').CONFIG
}));

// Mock the react-router-dom module, specifically useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),  // use actual for all non-hook parts
  useParams: jest.fn()
}));

// Mock react-redux to simply pass through the component
jest.mock('react-redux', () => ({
  connect: () => (component) => component,
  Provider: ({children}) => <div>{children}</div>
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

  it('renders the quiz component based on URL parameters for a known quiz', () => {
    require('react-router-dom').useParams.mockReturnValue({ quizName: 'basic' });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <TakeQuiz />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Be a citizen scientist! Try this quiz.')).toBeInTheDocument();
  });


});
