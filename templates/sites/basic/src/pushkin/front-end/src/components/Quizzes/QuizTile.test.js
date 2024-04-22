import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import QuizTile from './QuizTile';
import experiments from '../../../../../__mocks__/experiments';

// Mock window.open
beforeAll(() => {
    global.window.open = jest.fn();  
});

afterAll(() => {
    global.window.open.mockRestore(); 
});

// Mock aphrodite
jest.mock('aphrodite', () => ({
    StyleSheet: {
      create: jest.fn(styles => styles),
    },
    css: jest.fn(() => 'mocked-class-name'),
}));

// Mock react-social-icons maybe needed
jest.mock('react-social-icons', () => ({
    SocialIcon: ({ url, onClick }) => (
      <button onClick={onClick}>{url}</button>
    )
}));

describe('QuizTile Component', () => {
  // Function to render the component with given props
  const renderComponent = (props) => render(
    <Router>
      <QuizTile {...props} />
    </Router>
  );

  // Test each experiment config
  experiments.forEach((exp) => {
    test(`renders QuizTile for ${exp.shortName} without crashing`, () => {
      const props = {
        quizid: exp.shortName,
        img: exp.logo,
        title: exp.fullName,
        text: exp.text,
        post: exp.tagline,
      };
      renderComponent(props);
      expect(screen.getByText(exp.fullName)).toBeInTheDocument();
      expect(screen.getByText('Play Now')).toBeInTheDocument();
    });

    test(`mocks window.open on social icon click for ${exp.shortName}`, () => {
      const props = {
        quizid: exp.shortName,
        img: exp.logo,
        title: exp.fullName,
        text: exp.text,
        post: exp.tagline,
      };
      renderComponent(props);
      const facebookIcon = screen.getByText(/facebook\.com\/sharer\.php\?u=/i);
      fireEvent.click(facebookIcon);
      expect(window.open).toHaveBeenCalled();
    });

    test(`checks if navigation to quiz details works on card image click for ${exp.shortName}`, () => {
      const props = {
        quizid: exp.shortName,
        img: exp.logo,
        title: exp.fullName,
        text: exp.text,
        post: exp.tagline,
      };
      renderComponent(props);
      const cardImage = screen.getByRole('img');
      fireEvent.click(cardImage);
      // Add additional checks if needed
    });
  });

  // More generic tests can be added here if needed
});
