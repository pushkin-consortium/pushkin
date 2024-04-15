import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import QuizTile from './QuizTile';  

// Mock window.open
beforeAll(() => {
    global.window.open = jest.fn();  
  });
  
afterAll(() => {
    global.window.open.mockRestore(); 
  });

// Mock aphrodite
jest.mock('aphrodite', () => {
  return {
    StyleSheet: {
      create: jest.fn().mockImplementation(styles => styles),
    },
    css: jest.fn().mockImplementation(() => 'mocked-class-name'),
  };
});

// Quiz component tests 
describe('QuizTile Component', () => {
  const mockProps = {
    quizid: '123',
    img: 'image-url.jpg',
    title: 'Quiz Title',
    text: 'Sample text',
    post: 'Sample post',
  };

  // Render the component renders with the props 
  const renderComponent = (props = mockProps) => render(
    <Router>
      <QuizTile {...props} />
    </Router>
  );

  // Verify attributes 
  test('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Quiz Title')).toBeInTheDocument();
    expect(screen.getByText('Play Now')).toBeInTheDocument();
  });

  // Verify working & clickable icons 
  test('mocks window.open on social icon click', () => {
    renderComponent();
    const facebookIcon = screen.getByRole('link', { name: /facebook/i });
    fireEvent.click(facebookIcon);
    expect(window.open).toHaveBeenCalled();  // Verify that window.open was called
  });

  // Additional tests for interaction and dynamic content
});
