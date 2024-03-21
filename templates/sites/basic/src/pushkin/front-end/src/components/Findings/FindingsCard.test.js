import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FindingsCard from './FindingsCard';

test('Renders the FindingsCard component', () => {
    // Sample props for rendering - Add a representative 'name'
    const props = {
      image: '/sample-image.jpg',
      title: 'Sample Finding',
      description: 'This is a sample description',
      name: 'A clear description of the image', 
    };
  
    render(<FindingsCard {...props} />);
  
    // Assertions to check if elements are present
    const image = screen.getByRole('img'); // Find the image element 
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('alt', props.name); // Check the 'alt' attribute

    expect(screen.getByText('Sample Finding')).toBeInTheDocument();
    expect(screen.getByText('This is a sample description')).toBeInTheDocument();
});

