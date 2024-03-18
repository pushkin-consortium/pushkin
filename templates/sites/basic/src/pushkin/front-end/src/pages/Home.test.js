// Home.test.js
 
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import QuizPage from './Home'; // Adjust the import path as necessary

// Mocking the experiments data
const mockExperiments = [
  {
    shortName: 'test1',
    fullName: 'Test Quiz 1',
    duration: '5 min',
    text: 'Description for test1',
    tagline: 'Tagline for test1',
    logo: 'test1.png',
  },
  // Add more mock experiments as needed
];

jest.mock('../experiments.js', () => mockExperiments);

describe('QuizPage', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <QuizPage />
      </BrowserRouter>
    );
  });

  // Add more tests as necessary
});
