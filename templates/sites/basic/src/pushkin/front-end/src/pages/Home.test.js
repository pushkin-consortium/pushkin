// Home.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import QuizPage from './Home'; // Adjust the import path as necessary

// Mock experiments data
const mockExperiments = [
  {
    shortName: 'quiz1',
    fullName: 'Quiz 1',
    duration: '5 mins',
    text: 'Quiz 1 Description',
    tagline: 'Start Quiz 1',
    logo: 'quiz1-logo.png',
  },
  // Add more quizzes as needed for testing
];

// Mock the experiments import
jest.mock('../experiments.js', () => mockExperiments);

// Mock the 'require' function for images
jest.mock('../assets/images/quiz/quiz1-logo.png', () => 'quiz1-logo.png');

describe('QuizPage', () => {
  test('renders correctly with quizzes', () => {
    render(<QuizPage />);

    expect(screen.getByText('Pick a game to get started!')).toBeInTheDocument();
    expect(screen.getByText('Quiz 1')).toBeInTheDocument();
    expect(screen.getByAltText('Quiz 1')).toHaveAttribute('src', 'quiz1-logo.png');
    // Add more assertions as necessary
  });

  // Add more tests as needed, such as testing user interactions, conditional rendering, etc.
});
