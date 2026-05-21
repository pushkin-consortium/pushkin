const useAuth0 = () => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  loginWithRedirect: jest.fn(),
  logout: jest.fn(),
});

const Auth0Provider = ({ children }) => children;

module.exports = { useAuth0, Auth0Provider };
