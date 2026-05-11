import { useAuth0 } from "@auth0/auth0-react";
import React from "react";
import { Container, Button } from 'react-bootstrap';
import { pushkinConfig } from '../../.pushkin';

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const authDomain = pushkinConfig?.addons?.authDomain || '';

  if (isLoading) {
    return <div>Loading ...</div>;
  }

  return (
    isAuthenticated && (
      <Container className="text-center p-3">
        <img src={user.picture} alt={user.name} />
        <br />
        <p><h2>Username: {user.name}</h2></p>
        <p>Email: {user.email}</p>
        {authDomain && (
          <p><a href={`https://${authDomain}/user/settings`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline-primary" className="mt-3">
              Edit profile
            </Button>
          </a></p>
        )}
      </Container>
    )
  );
};

export default Profile;
