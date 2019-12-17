// Import react
import React from 'react';
import { Route, withRouter } from 'react-router-dom';

//import custom front-end stuff
//import logo from './logo.svg';
import './App.css';

//import page components
import HeaderContainer from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import TakeQuiz from './components/QuizTile/TakeQuiz';

//import pages
import homePage from './pages/home/index';
import aboutPage from './pages/about/index';
import feedbackPage from '.pages/feedback/index';

//auth
import { useAuth0 } from './utils/react-auth0-spa';

function App() {
  const { loading } = useAuth0();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <HeaderContainer />
      <Route exact path="/" component={homePage} />
      <Route exact path="/index" component={homePage} />
      <Route exact path="/index.html" component={homePage} />
      <Route exact path="/About" component={aboutPage} />
      <Route exact path="/Dashboard" component={homePage} />
      <Route exact path="/Feedback" component={feedback} />
      <Route path="/quizzes/:quizName" component={TakeQuiz} />
      <Footer />
    </div>
  );
}

export default withRouter(App);
