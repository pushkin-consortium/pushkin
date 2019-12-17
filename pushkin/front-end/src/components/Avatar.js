// src/components/Avatar.js

import React from 'react';
import { useAuth0 } from '../utils/react-auth0-spa';

const Avatar = () => {
  const { loading, user } = useAuth0();

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return <div>{user.name}</div>;
};

export default Avatar;
