# Users & Authentication

Subject responses are associated with a username. This is either a randomly-generated string, or it’s based off an auth0 userID. The value of the username is maintained in the redux store as `UserID`.

The userID is set by a redux saga:

```javascript
//actions/userInfo.js

export function getUser(isAuthenticated, user) {
  return {
    type: GET_USER,
    isAuthenticated: isAuthenticated,
    user: user
  };
}

//sagas/userInfo.js

export function* getUserLogic(action) {
  console.log('Saga2 initialized...');
  const id = action.isAuthenticated ?
    action.user :
    yield session.get();
  console.log(id);
  yield put({ type: SET_USER_ID, id: id });
}

export function* getUser() {
  yield takeLatest(GET_USER, getUserLogic);
}
```

Note that the action needs to be passed `isAuthenticated` and `user`, both of which come from the AuthProvidor \(see below\). For convenience, this saga is triggered every time the Header is loaded \(which is on every page\):

```javascript
const Header = props => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  if (!CONFIG.useAuth) {
    const isAuthenticated = false;
    const user = null;
  }

  useEffect(() => {
    props.dispatch(getUser(isAuthenticated, user));
  }, [isAuthenticated, props.userID, user]);
```

Note that `userEffect` is a React [lifecycle hook for functional components](https://itnext.io/add-state-and-lifecycle-methods-to-function-components-with-react-hooks-8e2bdc44d43d). It gets triggered when the component is loaded, as well as any time the values of `isAuthenticated, props.userID` or `user` change.

In principle, this saga could be triggered elsewhere. One thing to keep track of is that because it is asynchronous, components \(including the header\) may load before the user has been set.

## Generating UserIDs

### Randomly-generated string

If authenticated with auth0 is not enabled, then the value of `props.userID` comes from a cookie. For that code, see `front-end/src/utils/session.js`. The purpose of the cookie is to enable the userID to persist across browser refreshes \(browser refresh re-initializes the Redux store.\) Maximum life of the cookie is 2 days. \(We aren’t in the business of tracking people without opt-in consent.\)

Note that if authentication is not enabled, then the value of `isAuthenticated` will always be `false`. \(See the variable definitions in the Header component.\)

Note that the action triggering the creation \(or checking\) of the cookie \(`getSessionUser()`\) is handled by a Redux Saga \(see `front-end/src/sagas`\).

### Auth0

If authentication is enabled, then userIDs can be supplied by auth0. We use code from the auth0 SPA quickstart, which is found in `front-end/src/utils/react-auth0-spa.js`. This code provides a component that wraps the entire application in `front-end/src/index.js`:

```jsx
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
```

As you can see, it looks a lot like the Redux provider. It works similarly: children get access to a few useful variables and methods. You can see this in `react-auth0-spa.js`:

```jsx
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
```

You will notice `user`. By default, the value of `user` is the username from whatever social media application \(etc.\) the user used to authenticate. This is often the user’s actual name, which we don’t want. So the auth0 quickstart code was modified to retrieve the auth0 numerical ID instead, which is presumably \(??\) unique to your application. We then immediately run this through a salted hash.

Why? It makes it harder to link data in a Pushkin database to a person. That is, someone who had access to your database and to your auth0 account still wouldn’t be able to match the user data to an individual in auth0. They would also need the salt string, which is stored separately. Even if they had it, it would be a pain to use, because you can’t easily decrypt something that has been hashed. The only option would be to encrypt every auth0 ID and then see what in the database matches.

They key code is in `utils/react-auth0-spa.js`. First, we define a helper function:

```javascript
var crypto = require('crypto');
var sha512 = function(id, salt){
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(id);
    var value = hash.digest('base64');
    return value;
};
```

There are several different places where userIDs are retrieved. In each case, we encrypt:

```javascript
const claims = await auth0FromHook.getIdTokenClaims();
const encrypted = await sha512(claims.sub, CONFIG.salt);
setUser(encrypted);
```

Finally, note that when users log out of auth0, the `userID` is set to `null`:

```jsx
<b.Button onClick={() => {
    logout();
    props.dispatch(setUserID(null));
    }
  }>Logout</b.Button>
```

This will trigger the assignment of a new `userID` via the cookie method.

## Using UserIDs

`userID` is automatically available to any component that is connected to the Redux store. This unfortunately does not include the quizzes themselves. Instead, the TakeQuiz component passes the entire Redux store as a prop:

```jsx
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
```

\(Note that TakeQuiz is a connected component, so its props include the entire Redux store.\)

Most of the methods for Pushkin-Client expect to be explicitly sent the userID. This can be done from within the QuizComponent. For example:

```javascript
endExperiment() {
  this.setState({ experimentComplete: true });
  pushkin.endExperiment(this.props.userID);
}
```

The exception is any Pushkin Client method that is called directly by jsPsych’s `onFinish` function. This is because this function takes a single argument, which is trial data. Here is an example:

```javascript
saveStimulusResponse(data) {
  // Because we are saving data, it should be coming with a userID already
  // Might make sense at some point to confirm this is what we expect
  const postData = {
    user_id: data.user_id,
    data_string: data
  };
  return this.con.post('/stimulusResponse', postData);
}
```

You will see that this expects `user_id` to be passed as part of the data. The easiest way to make this happen is to use jsPsych’s handy [data.addProperties method](https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties). Here is a code snippet from one of the template experiments:

```javascript
async startExperiment() {
  this.props.history.listen(jsPsych.endExperiment);

  jsPsych.data.addProperties({user_id: this.props.userID}); //See https://www.jspsych.org/core_library/jspsych-data/#jspsychdataaddproperties
```

