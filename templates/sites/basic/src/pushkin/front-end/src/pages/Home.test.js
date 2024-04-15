import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { BrowserRouter as Router } from 'react-router-dom';
import QuizPage from './QuizPage';

// Mock the experiments data
jest.mock('../experiments', () => [
  {
    shortName: 'exp1',
    fullName: 'Experiment One',
    duration: 15,
    text: 'Description of Experiment One',
    tagline: 'Tagline of Experiment One',
    logo: 'exp1-logo.png'
  },
  {
    shortName: 'exp2',
    fullName: 'Experiment Two',
    duration: 30,
    text: 'Description of Experiment Two',
    tagline: 'Tagline of Experiment Two',
    logo: 'exp2-logo.png'
  }
], { virtual: true });

describe('QuizPage Component', () => {
  test('renders correctly without children', () => {
    render(
      <Router>
        <QuizPage />
      </Router>
    );

    // Assert static elements
    expect(screen.getByText(/citizen science to learn how the mind works/i)).toBeInTheDocument();
    expect(screen.getByText(/pick a game to get started!/i)).toBeInTheDocument();
    expect(screen.getByText(/feel free to send us feedback/i)).toBeInTheDocument();

    // Assert links
    expect(screen.getByText('HERE')).toHaveAttribute('href', '/feedback');

    // Assert dynamically generated QuizTiles
    expect(screen.getByText('Experiment One')).toBeInTheDocument();
    expect(screen.getByText('Experiment Two')).toBeInTheDocument();
  });

  test('renders children when provided', () => {
    const childrenContent = <div data-testid="children">Children Content</div>;
    render(
      <Router>
        <QuizPage children={childrenContent} />
      </Router>
    );

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByText(/citizen science to learn how the mind works/i)).not.toBeInTheDocument();
  });
});
