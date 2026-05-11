import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useDispatch, useSelector } from "react-redux";
import { setAuth0User, clearAuthUser } from "./userInfo";

function AuthSync() {
  const { isAuthenticated, user, isLoading, getAccessTokenSilently } = useAuth0();
  const dispatch = useDispatch();
  const sessionUserID = useSelector((state) => state.userInfo.userID); // get current Redux userID

  useEffect(() => {
    if (isLoading) return; // wait until Auth0 finishes

    const syncAuth = async () => {
      if (isAuthenticated && user) {
        let token = null;
        try {
          token = await getAccessTokenSilently();
        } catch (err) {
          console.warn("No token obtained", err);
        }

        console.log("Dispatching SET_AUTH0_USER with user:", user, "token:", token);
        dispatch(setAuth0User(user, token));
      } else {
        // Only clear if there is no session-based userID
        if (!sessionUserID) {
          dispatch(clearAuthUser());
        } else {
          console.log("Preserving session userID:", sessionUserID);
        }
      }
    };

    syncAuth();
  }, [isAuthenticated, user, isLoading, dispatch, getAccessTokenSilently, sessionUserID]);

  return null;
}

export default AuthSync;
