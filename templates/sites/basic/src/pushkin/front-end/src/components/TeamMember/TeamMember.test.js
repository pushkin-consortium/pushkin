import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';   
import TeamMember from './TeamMember';

// Try and render a team member card 
test('renders the team member card', () => {
  const teamMemberData = {
    name: 'Team Member Name',
    image: 'member.jpg', 
    description: 'Team member description'
  };
  render(<TeamMember {...teamMemberData} />);

  // Make sure name and description are on card 
  expect(screen.getByRole('img', { name: teamMemberData.name })).toBeInTheDocument(); // Access the name from the data object
  expect(screen.getByText(teamMemberData.description)).toBeInTheDocument();
});
