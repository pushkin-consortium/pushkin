// react imports
import React from 'react';
// //import PropTypes from 'prop-types';
import { LinkContainer } from 'react-router-bootstrap';

// styling
import { Container, CardDeck, Jumbotron, Row } from 'react-bootstrap';

// components
import QuizTile from '../components/Quizzes/QuizTile';

// experiments
import experiments from '../experiments.js';

function QuizPage(props) {
  if (!props.children) {
    return (
      <Container className="mt-4 text-center">
        <Jumbotron style={{ backgroundColor: '#eeeeee', marginBottom: '0px' }}>
          <div>
            We do <strong>citizen science</strong> to learn how the mind works.{' '}
          </div>
          <div>
            <strong>Pick a game to get started!</strong>
          </div>
          <div className="mt-3">
            Feel free to send us feedback{' '}
            <LinkContainer to="/feedback">
              <a>
                <strong>HERE</strong>
              </a>
            </LinkContainer>
          </div>
        </Jumbotron>
        <Row>
          {experiments.map(e => {
            return (
              <QuizTile
                quizid={e.shortName}
                title={e.fullName}
                duration={e.duration}
                text={e.text}
                post={e.tagline}
                key={e.shortName}
                img={require('../assets/images/quiz/' + e.logo)}
              />
            );
          })}
        </Row>
      </Container>
    );
  }
  return props.children;
}

export default QuizPage;
