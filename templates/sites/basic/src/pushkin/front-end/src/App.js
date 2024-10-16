// Import react
import React from 'react';
import { Route, Switch } from 'react-router-dom';

//import custom front-end stuff
//import logo from './logo.svg';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

//import page components
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import TakeQuiz from './components/Quizzes/TakeQuiz';
import Results from './components/Quizzes/Results';

//import pages
import HomePage from './pages/Home';
import FindingsPage from './pages/Findings';
import AboutPage from './pages/About';
import FeedbackPage from './pages/Feedback';

function App() {
  return (
    <>
      <div className="App" style={{ minHeight: '100vh', position: 'relative' }}>
        <Header />
        <Switch>
          <Route exact path="/">
            <HomePage />
          </Route>

          <Route path="/index">
            <HomePage />
          </Route>

          <Route path="/index.html">
            <HomePage />
          </Route>

          <Route path="/findings">
            <FindingsPage />
          </Route>

          <Route path="/about">
            <AboutPage />
          </Route>

          <Route path="/feedback">
            <FeedbackPage />
          </Route>

          <Route path="/quizzes/:quizName/results">
            <Results />
          </Route>

          <Route path="/quizzes/:quizName">
            <TakeQuiz />
          </Route>
        </Switch>
        <div style={{ height: '150px', marginTop: '3rem' }}></div>
        <Footer />
      </div>
    </>
  );
}

export default App;
