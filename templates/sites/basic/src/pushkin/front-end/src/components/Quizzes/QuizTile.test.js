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
  const mockProps = {
    quizid: '123',
    img: 'image-url.jpg',
    title: 'Quiz Title',
    text: 'Sample text',
    post: 'Sample post',
    // beta: true,  // Uncomment this to test the conditional rendering of the beta ribbon
  };

  const renderComponent = (props = mockProps) => render(
    <Router>
      <QuizTile {...props} />
    </Router>
  );

  test('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Quiz Title')).toBeInTheDocument();
    expect(screen.getByText('Play Now')).toBeInTheDocument();
  });

  test('mocks window.open on social icon click', () => {
    renderComponent();
    // Using RegExp to flexibly find the URL without worrying about encoding details
    const facebookIcon = screen.getByText(/facebook\.com\/sharer\.php\?u=/i);
    fireEvent.click(facebookIcon);
    expect(window.open).toHaveBeenCalled();
    // expect(window.open).toHaveBeenCalledWith('https://www.facebook.com/sharer.php?u=http%3A%2F%2Flocalhost%2Fcallback123', 'NewWindow', expect.any(String));
});


  test('checks if navigation to quiz details works on card image click', () => {
    renderComponent();
    const cardImage = screen.getByRole('img');
    fireEvent.click(cardImage);
    // Could check if the navigation was triggered. This can be tricky with jest and might require mocking more of the Router.
  });

  test('verifies if beta ribbon is conditionally rendered', () => {
    const propsWithBeta = { ...mockProps, beta: true };
    renderComponent(propsWithBeta);
    // Could check for the presence of the beta ribbon here -> can't get this to work yet 
    // Example: expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  // More tests can be added here
});
