// Import react
import React from 'react';
import { Route, Switch } from 'react-router-dom'

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

function App() {
  return (
    <><div className="App" style={{ minHeight: '100vh', position: 'relative' }}>
      <Header />
      <Switch>
        <Route exact path="/"><homePage /></Route>
        <Route path="/index"><homePage /></homePage></Route>
        <Route path="/index.html"><homePage /></Route>
        <Route path="/findings"><findingsPage /></Route>
        <Route path="/about"><aboutPage /></Route>
        <Route path="/feedback"><feedbackPage /></Route>
        <Route path="/quizzes/:quizName"><TakeQuiz /></Route>
    </Switch><div style={{ height: '150px', marginTop: '3rem' }}></div><Footer />
    </div></>
  );
}

export default App;

