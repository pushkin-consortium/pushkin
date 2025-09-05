import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom'; 
import FindingsCard from './FindingsCard';

// Mock baseProps of one card 
describe('FindingsCard component tests', () => {
    const baseProps = {
        image: '/sample-image.jpg',
        title: 'Sample Finding',
        description: 'This is a sample description',
        name: 'A clear description of the image',
    };

    // Wrap the component with Router for tests that need it
    const renderWithRouter = (ui, { route = '/' } = {}) => {
        window.history.pushState({}, 'Test page', route);
        return render(ui, { wrapper: Router });
    };

    test('Renders correctly with mandatory props', () => {
        renderWithRouter(<FindingsCard {...baseProps} />);
        
        // Make sure all expected attributes are present
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', baseProps.name);
        expect(screen.getByText('Sample Finding')).toBeInTheDocument();
        expect(screen.getByText('This is a sample description')).toBeInTheDocument();
        expect(screen.queryByText('Read more')).not.toBeInTheDocument(); // Link shouldn't be present
    });

    test('Renders "Read more" link when `link` prop is true', () => {
        // Adding a link prop
        const propsWithLink = {
            ...baseProps,
            link: true,
            url: '/read-more-url'
        };

        // Make sure link is popping correctly 
        renderWithRouter(<FindingsCard {...propsWithLink} />);
        expect(screen.getByText('Read more')).toBeInTheDocument(); // Now the link should be present
    });

    // Could add more tests here 
});
