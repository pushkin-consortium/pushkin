import React from 'react';

import { Row, CardDeck } from 'react-bootstrap';

// import Vocab from '../../components/Quizzes/Vocab';
// import Mind from '../../components/Quizzes/Mind';
// import WhichEnglish from '../../components/Quizzes/WhichEnglish';

const ExperimentHistory = () => {
  return (
    <CardDeck>
      <Row className="justify-content-between text-center">
        {/* <Vocab
          id="vocab"
          title="vocab"
          img={require('../../assets/images/quiz/Vocab.png')}
        />
        <Mind 
          id="mind"
          title="mind"
          img={require('../../assets/images/quiz/Mind.png')}
        />
        <WhichEnglish 
          id="whichenglish"
          title="which english"
          img={require('../../assets/images/quiz/WhichEnglish.png')}
        /> */}
      </Row>
    </CardDeck>
  );
};

export default ExperimentHistory;
