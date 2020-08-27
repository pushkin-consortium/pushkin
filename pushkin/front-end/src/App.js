// Import react
import React from 'react';
import { Route, withRouter } from 'react-router-dom';

//import custom front-end stuff
//import logo from './logo.svg';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

//import page components
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import TakeQuiz from './components/Quizzes/TakeQuiz';

//import pages
import homePage from './pages/Home';
import findingsPage from './pages/Findings';
import aboutPage from './pages/About';
import feedbackPage from './pages/Feedback';
import dashboardPage from './pages/dashboard/Dashboard';
import forumPage from './pages/Forum';

//auth
import { useAuth0 } from './utils/react-auth0-spa';

function App() {
  const { loading } = useAuth0();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App" style={{ minHeight: '100vh', position: 'relative' }}>
      <Header />
      <Route exact path="/" component={homePage} />
      <Route exact path="/index" component={homePage} />
      <Route exact path="/index.html" component={homePage} />
      <Route exact path="/findings" component={findingsPage} />
      <Route exact path="/about" component={aboutPage} />
      <Route exact path="/dashboard" component={dashboardPage} />
      <Route exact path="/forum" component={forumPage} />
      <Route exact path="/feedback" component={feedbackPage} />
      <Route path="/quizzes/:quizName" component={TakeQuiz} />
      <div style={{ height: '150px', marginTop: '3rem' }}></div>
      <Footer />
    </div>
  );
}

export default withRouter(App);
