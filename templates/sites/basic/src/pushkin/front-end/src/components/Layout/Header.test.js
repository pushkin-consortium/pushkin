import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import Header from './Header';
import userInfoReducer from '../../reducers/userInfo';
import '@testing-library/jest-dom';

// Mock the redux store
const mockUserInfoState = {
    userID: 'test-user-id',
};

const mockStore = configureStore({
    reducer: { userInfo: userInfoReducer },
    preloadedState: { userInfo: mockUserInfoState },
});

describe('Header component tests', () => {
    beforeEach(() => {
        render(
            <MemoryRouter>
                <Provider store={mockStore}>
                    <Header />
                </Provider>
            </MemoryRouter>
        );
    });

    test('renders navigation links correctly', () => {
        // Expect the navigation links to be in the document
        expect(screen.getByText('Quizzes')).toBeInTheDocument();
        expect(screen.getByText('Findings')).toBeInTheDocument();
        expect(screen.getByText('About')).toBeInTheDocument();

        // Optionally could verify that the links point to the correct paths
    });

    test('renders the navbar toggle for mobile view', () => {
        // Check for the navbar toggle for mobile view 
        const navbarToggle = screen.getByRole('button', { name: /toggle navigation/i });
        expect(navbarToggle).toBeInTheDocument();
    });

    // Could add tests for redux integration or effect hook behavior 
});
