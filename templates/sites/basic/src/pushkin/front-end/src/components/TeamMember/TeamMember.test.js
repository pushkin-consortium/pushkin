import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';   
import TeamMember from './TeamMember';

describe('TeamMember component', () => {
  const teamMemberData = {
    name: 'Team Member Name',
    image: 'member.jpg', 
    description: 'Team member description'
  };

  beforeEach(() => {
    render(<TeamMember {...teamMemberData} />);
  });

  test('renders the team member card with all props correctly', () => {
    // Check for the image alt text and src attribute
    const image = screen.getByRole('img', { name: teamMemberData.name });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', teamMemberData.image);
    expect(image).toHaveAttribute('alt', teamMemberData.name);

    // Check for the name and description
    expect(screen.getByText(teamMemberData.name)).toBeInTheDocument();
    expect(screen.getByText(teamMemberData.description)).toBeInTheDocument();
  });

  test('ensures critical styles are applied', () => {
    // Simple check to make sure background color renders correctly
    const card = screen.getByRole('img', { name: teamMemberData.name }).closest('.card');
    expect(card).toHaveStyle('background-color: #B7E0F2');
  });

  test('verifies structural integrity', () => {
    expect(screen.getByText(teamMemberData.name)).toBeInTheDocument();
    expect(screen.getByText(teamMemberData.description)).toBeInTheDocument();
  });

  // Could add some more tests here 
});
