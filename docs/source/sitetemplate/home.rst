.. _home:

Home Page
=========

Jumbotron
----------

The Jumbotron is a lightweight, flexible component that can optionally extend the entire viewport to showcase key content on your site.

.. code-block:: javascript

  <Jumbotron style={{backgroundColor:'#eeeeee'}}>
    <div>
      We do <strong>citizen science</strong> to learn how the mind
      works.{' '}
    </div>
    <div>
      <strong>
        Pick a game to get started!
      </strong>
    </div>
    <div className="mt-3">
      Feel free to send us feedback <LinkContainer to="/feedback"><a><strong>HERE</strong></a></LinkContainer>
    </div>
  </Jumbotron>

It includes a link to the feedback page, an archor tag wrapped in ``<LinkContainer>`` component.

Card
-----

`Bootstrap’s cards <https://react-bootstrap.netlify.app/components/cards/>`_ provide a flexible and extensible content container with multiple variants and options:

 - Body: Use ``<Card.Body>`` to pad content inside a ``<Card>``.
 - Title, text, and links: Using ``<Card.Title>``, ``<Card.Subtitle>``, and ``<Card.Text>`` inside the ``<Card.Body>`` will line them up nicely. ``<Card.Link>`` are used to line up links next to each other.
 - Images: Cards include a few options for working with images. Choose from appending “image caps” at either end of a card, overlaying images with card content, or simply embedding the image in a card.

For example, the vocabulary quiz card in the template site:

.. code-block:: javascript

  <Card className="border-0 shadow" style={styles.card}>
    <Card.Body>
      <Card.Img src={this.props.img} style={styles.cardImage} />
      <Card.Title className="mt-4" style={styles.cardTitle}>
        {this.props.title}
      </Card.Title>
      <Card.Text className="mt-4" style={styles.cardText}>
        <Row>
          How many words do you know? See your results at the end.
        </Row>
        {this.props.duration && (
          <p>
            {' '}
            <strong>
              {' '}
              Average time: {this.props.duration} minutes.{' '}
            </strong>{' '}
          </p>
        )}
        {this.state.count && (
          <p> {this.state.count} players so far! </p>
        )}
      </Card.Text>
    </Card.Body>
    <Row className="justify-content-center mt-2">
      <LinkContainer style={styles.cardButton} to={'/quizzes/' + this.props.id}>
        <Button className="btn-danger">Play Now</Button>
      </LinkContainer>
    </Row>
    <Row className="justify-content-center mt-3 mb-3">
        <SocialIcon
          url={share.facebook}
          onClick={e => {
            e.preventDefault();
            share.open(share.facebook);
          }}
          style={styles.socialIcon}
          target="_blank"
        />
        <SocialIcon
          url={share.twitter}
          onClick={e => {
            e.preventDefault();
            share.open(share.twitter);
          }}
          style={styles.socialIcon}
          target="_blank"
        />
        <SocialIcon
          url={share.email}
          style={styles.socialIcon}
          target="_blank"
        />
      </Row>
  </Card>

The components inside a quiz card, in order from top to bottom, are:

 - ``<Card.Img>``: Quiz cover image
 - ``<Card.Title>``: Quiz name
 - ``<Card.Text>``: Quiz description
 - ``<Button>``: Wrapped in ``<LinkContainer>``
 - ``<SocialIcon>``: The `react social icons <https://www.npmjs.com/package/react-social-icons>`_ provides a set of beautiful svg social icons.

CardDeck
---------

The ``<CardDeck>`` creates a grid of cards that are of equal height and width. The layout will automatically adjust as you insert more cards. We recommend putting every 3 cards in a card deck. Quizzes are wrapped in card decks in ``Home.js`` located in ``pushkin/front-end/src/pages``.
