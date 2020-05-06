.. _quiz:

Add a Quiz
===========

To add a quiz, run ``pushkin experiment basic yourQuizName``. This will create a pushkin experiment template experiment in the ``experiments/`` folder.

After running ``pushkin prep``, the ``experiments.js`` located in ``pushkin/front-end/src`` will be updated.

The ``experiments.js`` contains a array of objects:

.. code-block:: javascript

  export default [
    { fullName: 'vocab Experiment', shortName: 'vocab', module: pushkinComponent7e170301859545dab691a08652b798a8, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
    { fullName: 'mind Experiment', shortName: 'mind', module: pushkinComponent1d77ca65c9f94dac834629611d452c8e, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
    { fullName: 'whichenglish Experiment', shortName: 'whichenglish', module: pushkinComponentbbca5356917345c2b2532e84e5325197, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
  ];

The ``shortName`` is the experiment you named in ``pushkin experiment basic`` command, you can learn more about experiment structure :ref:`HERE <experiment_structure>`.

After that, you need to map this array of objects into quiz components props in ``src/pages/Home.js``:

.. code-block:: javascript

  import experiments from '../experiments.js';

  // ......

  {experiments.map(e => {
              if (e.shortName === 'vocab') {
                return <Vocab
                        id={e.shortName}
                        title={e.fullName}
                        duration={e.duration}
                        post={e.tagline}
                        img={require('../assets/images/quiz/Vocab.png')}
                        key={e.shortName}
                      />
              } else if (e.shortName === 'mind') {
                 return <Mind
                          id={e.shortName}
                          title={e.fullName}
                          duration={e.duration}
                          post={e.tagline}
                          img={require('../assets/images/quiz/Mind.png')}
                          key={e.shortName}
                        />
              } else if (e.shortName === 'whichenglish') {
                 return <WhichEnglish 
                          id={e.shortName}
                          title={e.fullName}
                          duration={e.duration}
                          post={e.tagline}
                          img={require('../assets/images/quiz/WhichEnglish.png')}
                          key={e.shortName}
                        />
              }
            })}
  
  // ......

Then you can use those props in your quiz component and add quiz description in ``<Card.Text>``, for example, the ``<Vocab>`` component:

.. code-block:: javascript

  <Card className="border-0 shadow" style={styles.card}>
    <Card.Body>
      <Card.Img src={this.props.img} style={styles.cardImage} />
      <Card.Title className="mt-4" style={styles.cardTitle}>
        {this.props.title}
      </Card.Title>
      <Card.Text className="mt-4" style={styles.cardText}>
        Forget psychics, all of us have to read minds. We try to figure out
        what people are thinking based on what they say or do. See your
        results at the end.
      </Card.Text>
    </Card.Body>
    <Row className="justify-content-center mt-2">
      <LinkContainer
        style={styles.cardButton}
        to={'/quizzes/' + this.props.id}
      >
        <Button>Play Now</Button>
      </LinkContainer>
    </Row>
    // ......
  </Card>