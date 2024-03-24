import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom'; // Import MemoryRouter
import { configureStore } from '@reduxjs/toolkit'; // Assuming you're using Redux Toolkit 
import { CONFIG } from '../../config';
import Header from './Header';
import userInfoReducer from '../../reducers/userInfo'; // Import your userInfo reducer
import '@testing-library/jest-dom'; 

// Mock data (update this to match your reducer's state)
const mockUserInfoState = {
  userID: 'test-user-id',
};

// Creates a mock Redux store
const mockStore = configureStore({
  reducer: { userInfo: userInfoReducer },
  preloadedState: { userInfo: mockUserInfoState }, 
});

describe('Header component', () => {
    it('renders the site name and logo', () => {
        // Render with MemoryRouter
        render(
          <MemoryRouter> 
            <Provider store={mockStore}>
              <Header />
            </Provider>
          </MemoryRouter>
        );

    // Get the elements you want to test
    const siteName = screen.getByText(CONFIG.whoAmI);
    const logo = screen.getByRole('img');

    // Make assertions
    expect(siteName).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'test-file-stub');
});

  // ... More tests for navigation links, user interactions, etc.
});
