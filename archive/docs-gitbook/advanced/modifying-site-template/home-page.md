# Home Page

## Add a Quiz

To add a quiz, run `pushkin install experiment`. Select the experiment template of choice \([see this list for the options](../modifying-experiment-templates/#current-templates)\). This will create a pushkin experiment template in the `experiments/` folder.

Open the `config.js` located in your experiment folder, and modify the experiment name, shortName, logo, text, etc.

```javascript
experimentName: &fullName 'mind Experiment'
shortName: &shortName 'mind' # This should be unique as its used for urls, etc.
apiControllers: # The default export from each of these locations will be attached to a pushkin API
  - mountPath: *shortName
    location: 'api controllers'
    name: 'mycontroller'
worker:
  location: 'worker'
  service: # what to add as a service in main compose file
    image: *shortName
    links:
      - message-queue
      - test_db
    environment:
      - "AMQP_ADDRESS=amqp://message-queue:5672"
      - "DB_USER=postgres"
      - "DB_PASS="
      - "DB_URL=test_db"
      - "DB_NAME=test_db"
webPage:
  location: 'web page'
migrations:
  location: 'migrations'
seeds:
  location: ''
# Used for migration and seed commands via main CLI
# Note that these might be different than those given to the worker,
# Since it's running inside a linked docker container
database: 'localtestdb'
logo: 'Mind.png'
text: 'Enter your experiment description here'
tagline: 'Be a citizen scientist! Try this quiz.'
duration: ''
```

After running `pushkin prep`, the `experiments.js` located in `pushkin/front-end/src` will be updated, it should be an array of objects like this:

```javascript
export default [
  { fullName: 'vocab Experiment', shortName: 'vocab', module: pushkinComponent7e170301859545dab691a08652b798a8, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
  { fullName: 'mind Experiment', shortName: 'mind', module: pushkinComponent1d77ca65c9f94dac834629611d452c8e, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
  { fullName: 'whichenglish Experiment', shortName: 'whichenglish', module: pushkinComponentbbca5356917345c2b2532e84e5325197, logo: 'logo512.png', tagline: 'Be a citizen scientist! Try this quiz.', duration: '' },
];
```

Then the new quiz card will be automatically added to the home page.

## Jumbotron

[The Jumbotron](https://react-bootstrap.github.io/components/jumbotron/) is a lightweight, flexible component that can optionally extend the entire viewport to showcase key content on your site.

```jsx
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
```

It includes a link to the feedback page and an anchor tag wrapped in `<LinkContainer>` component.

## CardDeck

The `<CardDeck>` creates a grid of cards that are of equal height and width. The layout will automatically adjust as you insert more cards. We recommend putting every 3 cards in a card deck. Quizzes are wrapped in card decks in `Home.js` located in `pushkin/front-end/src/pages`.

## Card

[Bootstrap’s cards](https://react-bootstrap.netlify.app/components/cards/) provides a flexible and extensible content container with multiple variants and options:

> * Body: Use `<Card.Body>` to pad content inside a `<Card>`.
> * Title, text, and links: Using `<Card.Title>`, `<Card.Subtitle>`, and `<Card.Text>` inside the `<Card.Body>` will line them up nicely. `<Card.Link>` are used to line up links next to each other.
> * Images: Cards include a few options for working with images. Choose from appending “image caps” at either end of a card, overlaying images with card content, or simply embedding the image in a card.
> * Image clickable area styling: If you would like to use circular images and limit the clickable space to be circular, be sure to keep the `:hoverStyles.circleStyle` className in the `<LinkContainer`. If you would like to use square or rectangular images, be sure to not include this className.

For example, the quiz card in the home page:

```jsx
<Card className="border-0 shadow" style={styles.card}>
  <Card.Body>
    <LinkContainer
      // style={styles.cardButton}
      to={'/quizzes/' + this.props.id}
      className={css(hoverStyles.opacityStyle, hoverStyles.circleStyle)}
    >
      <Card.Img src={this.props.img} style={styles.cardImage} />
    </LinkContainer>
    <Card.Title className="mt-4" style={styles.cardTitle}>
      {this.props.title}
    </Card.Title>
    <Card.Text className="mt-4" style={styles.cardText}>
      {this.props.text}

      {/* {this.props.duration && (
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
      )} */}
    </Card.Text>
  </Card.Body>
  <Row className="justify-content-center mt-2">
    <LinkContainer
      // style={styles.cardButton}
      to={'/quizzes/' + this.props.id}
    >
      <Button className={css(hoverStyles.cardButton)}>Play Now</Button>
    </LinkContainer>
  </Row>
  <Row className="justify-content-center mt-3 mb-3">
    <i.SocialIcon
      url={share.facebook}
      onClick={e => {
        e.preventDefault();
        share.open(share.facebook);
      }}
      className={css(hoverStyles.socialIcon, hoverStyles.opacityStyle)}
      target="_blank"
    />
    <i.SocialIcon
      url={share.twitter}
      onClick={e => {
        e.preventDefault();
        share.open(share.twitter);
      }}
      className={css(hoverStyles.socialIcon, hoverStyles.opacityStyle)}
      target="_blank"
    />
    <i.SocialIcon
      url={share.email}
      className={css(hoverStyles.socialIcon, hoverStyles.opacityStyle)}
      target="_blank"
    />
    {/* BETA ribbon */}
    {/* {this.props.beta && (
      <LinkContainer to={'/quizzes/' + this.props.id}>
        <div className={s.ribbon + ' ' + s.ribbonBottomLeft}>
          {' '}
          <span>BETA</span>{' '}
        </div>
      </LinkContainer>
    )} */}
  </Row>
</Card>
```

The components inside a quiz card, in order from top to bottom, are:

> * `<Card.Img>`: Quiz cover image
> * `<Card.Title>`: Quiz name
> * `<Card.Text>`: Quiz description
> * `<Button>`: Wrapped in `<LinkContainer>`
> * `<SocialIcon>`: The [react social icons](https://www.npmjs.com/package/react-social-icons) provides a set of beautiful svg social icons.

