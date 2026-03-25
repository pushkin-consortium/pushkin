import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useDispatch } from 'react-redux';
import { setUserID } from '../actions/userInfo';

const useAuth0Sync = () => {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const dispatch = useDispatch();

  useEffect(() => {
    const registerUser = async () => {
      if (isAuthenticated && user && !isLoading) {
        try {
          // Extract Auth0 user data
          const userData = {
            auth0_id: user.sub, // Auth0 unique ID
            email: user.email,
            name: user.name,
            picture: user.picture,
            auth_provider: user.sub.split('|')[0] // Extract provider (e.g., 'google-oauth2')
          };

          // Determine API URL based on environment
          const apiUrl = process.env.NODE_ENV === 'production'
            ? 'https://api.ew.cherriechang.com/users/registerAuth0User'
            : 'http://localhost/api/users/registerAuth0User';

          // Send user data to Pushkin API
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          const data = await response.json();

          if (data.success) {
            console.log('User synced with Pushkin:', data);
            // Update Redux store with the Pushkin user_id
            dispatch(setUserID(data.user_id));
          } else {
            console.error('Failed to sync user:', data.error);
          }
        } catch (error) {
          console.error('Error syncing Auth0 user with Pushkin:', error);
        }
      }
    };

    registerUser();
  }, [isAuthenticated, user, isLoading]);
};

export default useAuth0Sync;
