import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom'; 
import { configureStore } from '@reduxjs/toolkit'; 
import { CONFIG } from '../../config';
import Header from './Header';
import userInfoReducer from '../../reducers/userInfo'; 
import '@testing-library/jest-dom'; 

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

    // Get the elements to test
    const siteName = screen.getByText(CONFIG.whoAmI);
    const logo = screen.getByRole('img');

    // Make assertions
    expect(siteName).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', 'test-file-stub');
});

  // ... Could add more tests here 
});
