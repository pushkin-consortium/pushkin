.. _usernames:

Users & Authentication
####################

Subject responses are associated with a username. This is either a randomly-generated string, or it's based off an auth0 userID. The value of the username is maintained in the redux store as ``UserID``.

The central logic for assigning and maintaining usernames is handled by ``front-end/src/components/Layout/Header.js``. Note that the Header component is connected to the redux store, so ``userID`` is passed as a prop.

This is the key code:

:: javascript
  
  useEffect(() => {
    if (isAuthenticated) {
      if (props.userID != user) {
        //Either we just logged in, or the page refreshed. Anyway, update.
        props.dispatch(setUserID(user)); 
      }
    } else {
      // Not authenticated
      if (!props.userID) {
        // No ID in redux store. Either a) this is a new user, b) the browser refreshed, or
        // c) user just logged out of auth0 (which triggers deleting the ID from redux store)
        // Get a new ID from a session cookie.
        props.dispatch(getSessionUser());
      }
    }
  }, [isAuthenticated, props.userID, user, userID]);

Note that ``userEffect`` is a React `lifecycle hook for functional components <https://itnext.io/add-state-and-lifecycle-methods-to-function-components-with-react-hooks-8e2bdc44d43d>`_. It gets triggered when the component is loaded, as well as any time the values of ``isAuthenticated, props.userID, user``, or ``userID`` change. 

Since this is part of the header component, which is on every page, this logic gets triggered as soon as the user navigates to the website.

Generating UserIDs
===================

Randomly-generated string
-------------------

If authenticated with auth0 is not enabled, then the value of ``props.userID`` comes from a cookie. For that code, see ``front-end/src/utils/session.js``. The purpose of the cookie is to enable the userID to persist across browser refreshes (browser refresh re-initializes the Redux store.) Maximum life of the cookie is 2 days. (We aren't in the business of tracking people without opt-in consent.)

Note that if authentication is not enabled, then the value of ``isAuthenticated`` will always be ``false``. (See the variable definitions in the Header component.)

Note that the action triggering the creation (or checking) of the cookie (``getSessionUser()``) is handled by a Redux Saga (see ``front-end/src/sagas``).

Auth0
-------------------

If authentication is enabled, then userIDs can be supplied by auth0. We use code from the auth0 SPA quickstart, which is found in ``front-end/src/utils/react-auth0-spa.js``. This code provides a component that wraps the entire application in ``front-end/src/index.js``:

:: javascript

  <Auth0Provider
    domain={CONFIG.authDomain}
    client_id={CONFIG.authClientID}
    redirect_uri={window.location.origin}
    onRedirectCallback={onRedirectCallback}
  >
    <Provider store={store}>
      <Router history={customHistory}>
        <App />
      </Router>
    </Provider>
  </Auth0Provider>,

As you can see, it looks a lot like the Redux providor. It works similarly: children get access to a few useful variables and methods. You can see this in ``react-auth0-spa.js``:

:: javascript

  return (
    <Auth0Context.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        popupOpen,
        loginWithPopup,
        handleRedirectCallback,
        getIdTokenClaims: (...p) => auth0Client.getIdTokenClaims(...p),
        loginWithRedirect: (...p) => auth0Client.loginWithRedirect(...p),
        getTokenSilently: (...p) => auth0Client.getTokenSilently(...p),
        getTokenWithPopup: (...p) => auth0Client.getTokenWithPopup(...p),
        logout: (...p) => auth0Client.logout(...p)
      }}
    >
      {children}
    </Auth0Context.Provider>
  );

You will notice ``user``. By default, the value of ``user`` is the username from whatever social media application (etc.) the user used to authenticate. This is often the user's actual name, which we don't want. So the auth0 quickstart code was modified to retrieve the auth0 numerical ID instead, which is presumably (??) unique to your application. We then immediately run this through a public-key encryption.

Why? It makes it harder to link data in a Pushkin database to a person, particularly if you delete the private key (which we recommend). That is, someone who had access to your database and to your auth0 account still wouldn't be able to match the user data to an individual in auth0. They would also need your public key, which is stored separately. Even if they had it, it would be a pain to use, because without the private key, you can't decrypt the userIDs. The only option would be to encrypt every auth0 ID and then see what in the database matches.

The key code appears in several places in ``react-auth0-spa.js``:

:: javascript

    const claims = await auth0Client.getIdTokenClaims();
    const encrypted = await key.encrypt(claims.sub, 'hex');
    setUser(encrypted);

Finally, note that when users log out of auth0, the ``userID`` is set to ``null``:

:: javascript

  <b.Button onClick={() => {
      logout(); 
      props.dispatch(setUserID(null));
      }
    }>Logout</b.Button>

This will trigger the assignment of a new ``userID`` via the cookie method.


Using UserIDs
=================

``userID`` is automatically available to any component that is connected to the Redux store. This unfortunately does not include the quizzes themselves. Instead, the TakeQuiz component passes the entire Redux store as a prop:

:: javascript

	class TakeQuiz extends React.Component {
	  render() {
	    const { match } = this.props;
	    const QuizComponent = expObject[match.params.quizName];
	    return (
	      <div>
	        <QuizComponent {...this.props} />
	      </div>
	    );
	  }
	}

(Note that TakeQuiz is a connected component, so its props include the entire Redux store.)