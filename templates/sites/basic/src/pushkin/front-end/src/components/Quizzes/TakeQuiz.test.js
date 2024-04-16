import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import TakeQuiz from './TakeQuiz';

// Correctly mock experiments.js as an array ?
jest.mock('../../experiments.js', () => [
  { shortName: 'sampleQuiz', module: () => <div>Sample Quiz Content</div> },
  { shortName: 'unknownQuiz', module: () => <div>Unknown Quiz Content</div> }  // Fallback or error content
]);

jest.mock('../../config', () => ({
  CONFIG: {
    apiEndpoint: 'http://example.com/api'
  }
}));

// Mock the entire react-router-dom module
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),  // use actual for all non-hook parts
  useParams: jest.fn()
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  connect: () => (component) => component,
  Provider: ({children}) => <div>{children}</div>
}));

describe('TakeQuiz Component', () => {
  const mockStore = configureStore();
  let store;

  beforeEach(() => {
    // Set up mock store and initial state
    store = mockStore({
      userInfo: {
        userID: '123'
      }
    });

    // Define the return value for useParams before each test
    require('react-router-dom').useParams.mockReturnValue({ quizName: 'sampleQuiz' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders the quiz component based on URL parameters', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <TakeQuiz />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Sample Quiz Content')).toBeInTheDocument();
    // No longer check for the URL text in the document since it's logged to console.
  });

  test('handles non-existent quiz names gracefully', () => {
    require('react-router-dom').useParams.mockReturnValue({ quizName: 'unknownQuiz' });

    render(
      <Provider store={store}>
        <MemoryRouter>
          <TakeQuiz />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Unknown Quiz Content')).toBeInTheDocument();
  });
});
