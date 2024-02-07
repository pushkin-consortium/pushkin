## Customizing Sites
### About Page

The About page is wrapped in a fluid `Container` component, which is a full-width container, spanning the entire width of the viewport.

#### Card Image Overlays

The `<Card.ImgOverlay>` component turns an image into a card background and overlays your card’s text:

```jsx
<Card className="bg-dark text-white">
  <Card.Img src={require("../assets/images/aboutPage/AboutUs.jpeg")} />
  <Card.ImgOverlay>
    <Card.Title as="h1" style={{marginTop:'12rem'}}>
      Who We Are
    </Card.Title>
    <Card.Text as="h4" className="m-5">
      We do citizen science to learn how the the mind works.
    </Card.Text>
    <Card.Text as="h4">
      We are awesome scientists!
    </Card.Text>
  </Card.ImgOverlay>
</Card>
```

#### Add a Team Member In About Page

To add a team member to the About page, open `People.js` located in `components/TeamMember`, it should be an array of objects that look like this:

```javascript
const people = [
  {
    name: 'Team Member Name',
    image: 'Template.png',
    description: 'Enter team member description here.'
  },
  {
    name: 'Team Member Name',
    image: 'Template.png',
    description: 'Enter team member description here.'
  },
  {
    name: 'Team Member Name',
    image: 'Template.png',
    description: 'Enter team member description here.'
  },
]
```

Each object contains three properties: name, image, and description. Edit the name and description properties in `People.js`.

To add a profile picture of the team member. Copy the image file into the `assets/images/teamMember` folder.

Then edit the image property in `People.js`, making sure the name of the image file and the image property here match, including the extension name, like: `bob.jpg`.

### Feedback Page

You can go to the feedback page by clicking the `HERE` button of  jumbotron in the home page or clicking the `Leave Feedback` button in the footer.

To embed a Google form into the feedback page:

1. Create your own [google form](https://www.google.com/forms/about/)
2. Go to “Form” dropdown in the spreadsheet view, and click “Embed form in a webpage”.
3. This will give you an `<iframe>` snippet to place on the site template.
4. Change the `src` attribute in `<iframe>` to your Google form link, it is located in `pushkin/front-end/src/pages/Feedback.js`

### Findings Page

#### Add a Findings Card

To add a card to the findings page, open `FindingsData.js` located in `components/Findings`. You should see an array of objects that looks like this:

```javascript
const findingsData = [
  {
    id: 1,
    title: 'Finding 1',
    image: 'stock1.jpeg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. A scelerisque purus semper eget duis at tellus at. Ultrices sagittis orci a scelerisque purus. Aliquet eget sit amet tellus cras adipiscing enim. Lorem dolor sed viverra ipsum nunc aliquet. Sagittis orci a scelerisque purus semper. Pulvinar etiam non quam lacus suspendisse faucibus. Id porta nibh venenatis cras sed felis eget. Vitae sapien pellentesque habitant morbi tristique. Platea dictumst quisque sagittis purus sit amet volutpat. Pharetra et ultrices neque ornare aenean euismod elementum nisi quis. Nulla aliquet enim tortor at auctor urna nunc id cursus. Curabitur gravida arcu ac tortor dignissim.Habitasse platea dictumst quisque sagittis purus sit amet. Porttitor leo a diam sollicitudin tempor id eu nisl. Aenean vel elit scelerisque mauris pellentesque pulvinar pellentesque habitant. Varius duis at consectetur lorem donec massa. Molestie nunc non blandit massa enim nec dui.',
    link: true,
    url: 'https://www.google.com/'
  },
  {
    id: 2,
    title: 'Finding 2',
    image: 'stock2.jpeg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. A scelerisque purus semper eget duis at tellus at. Ultrices sagittis orci a scelerisque purus. Aliquet eget sit amet tellus cras adipiscing enim. Lorem dolor sed viverra ipsum nunc aliquet. Sagittis orci a scelerisque purus semper. Pulvinar etiam non quam lacus suspendisse faucibus. Id porta nibh venenatis cras sed felis eget. Vitae sapien pellentesque habitant morbi tristique. Platea dictumst quisque sagittis purus sit amet volutpat. Pharetra et ultrices neque ornare aenean euismod elementum nisi quis. Nulla aliquet enim tortor at auctor urna nunc id cursus. Curabitur gravida arcu ac tortor dignissim.Habitasse platea dictumst quisque sagittis purus sit amet. Porttitor leo a diam sollicitudin tempor id eu nisl. Aenean vel elit scelerisque mauris pellentesque pulvinar pellentesque habitant. Varius duis at consectetur lorem donec massa. Molestie nunc non blandit massa enim nec dui.',
    link: false,
    url: ''
  },
  {
    id: 3,
    title: 'Finding 3',
    image: 'stock3.jpeg',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. A scelerisque purus semper eget duis at tellus at. Ultrices sagittis orci a scelerisque purus. Aliquet eget sit amet tellus cras adipiscing enim. Lorem dolor sed viverra ipsum nunc aliquet. Sagittis orci a scelerisque purus semper. Pulvinar etiam non quam lacus suspendisse faucibus. Id porta nibh venenatis cras sed felis eget. Vitae sapien pellentesque habitant morbi tristique. Platea dictumst quisque sagittis purus sit amet volutpat. Pharetra et ultrices neque ornare aenean euismod elementum nisi quis. Nulla aliquet enim tortor at auctor urna nunc id cursus. Curabitur gravida arcu ac tortor dignissim.Habitasse platea dictumst quisque sagittis purus sit amet. Porttitor leo a diam sollicitudin tempor id eu nisl. Aenean vel elit scelerisque mauris pellentesque pulvinar pellentesque habitant. Varius duis at consectetur lorem donec massa. Molestie nunc non blandit massa enim nec dui.',
    link: false,
    url: ''
  }
];
```

You can edit five of the properties: **title**, **image**, **description**, **link**, and **url** in each object, in order to change the content in each findings card. You can add more by copying and pasting from { through }, making sure that you have a comma after } any time there is another { following.

To add an external link, set link property to `true` and fill the url property. Then a Read More button will appear on the findings card.

#### CardGroup

The `<CardGroup>` component renders cards as a single, attached element with equal width and height columns. We wrapped card components in `<CardGroup>` inside a `<Container>` in the findings page.

#### Align Card Vertically in CardGroup

Use two `<Col>` components wrapped in one `<Row>` inside cards:

```jsx
<Card>
  <Row>
    <Col>
      ...
    </Col>
    <Col>
      ...
    </Col>
  </Row>
</Card>
```

The content in the first `<Col>` will be on the left side of the card. And the content in the second `<Col>` will be on the right side of the card.

For example, the first card in the findings page has its `<Card.Img>` in the first `<Col>`, `<Card.Body>`, `<Card.Title>`, `<Card.Text>` in the second `<Col>`

### Header and Footer

The `Header.js` and `Footer.js` components are located in `pushkin/front-end/src/components/Layout`

#### Navbar logo

To Change the logo in the navbar, copy your logo image into the `pushkin/front-end/src/assets/logo` folder, modify the path in `src={require("../../assets/images/logo/NavbarLogo.png")}` in the `<Navbar.Brand>`. You can also modify the logo’s size using the `width` and `height` attributes in the `<img />` tag.

#### Navbar Color Schemes

Choose from `variant="light"` for use with light background colors, `variant="dark"` for dark background colors. Then, customize with the `bg` prop or any custom css! You can also use the `className` prop in the `<Navbar>` component, like `className="navbar-dark bg-dark"`

### Footer

The footer is wrapped in `<Row>` component. You can change the background color in the style prop: `style={{backgroundColor:'#eeeeee'}}`.

### Home Page

#### Add a Quiz

To add a quiz, run `pushkin install experiment`. Select the experiment template of choice \([see this list for the options](../advanced/customizing-experiments.md)\). This will create a pushkin experiment template in the `experiments/` folder.

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

#### Jumbotron

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

#### CardDeck

The `<CardDeck>` creates a grid of cards that are of equal height and width. The layout will automatically adjust as you insert more cards. We recommend putting every 3 cards in a card deck. Quizzes are wrapped in card decks in `Home.js` located in `pushkin/front-end/src/pages`.

#### Card

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

### React Bootstrap

The pushkin site template uses [React-Bootstrap](https://react-bootstrap.github.io/) as its front-end UI library. It is a complete re-implementation of the Bootstrap components using React. It has no dependency on either bootstrap.js or jQuery.

#### Import Libraries

You should import individual components like: `react-bootstrap/Button` rather than the entire library. Doing so pulls in only the specific components that you use, which can significantly reduce the amount of code you end up sending to the client:

```javascript
import Button from 'react-bootstrap/Button';

// or less ideally
import { Button } from 'react-bootstrap';
```

### Inline Styling

In React, inline styles are not specified as a string. Instead, they are specified with an object whose key is the camelCased version of the style name, and whose value is the style’s value, usually a string:

```css
const styles = {
  card: {
    backgroundColor: '#B7E0F2',
    borderRadius: 55
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 600
  },
  cardBody: {
    padding: '2.5rem'
  },
  cardImage: {
    width: '100%',
    height: '15vw',
    objectFit: 'cover',
    borderRadius: 55
  }
}
```

React lets you add CSS inline, written as attributes and passed to elements:

```jsx
<Container className="p-0" fluid style={styles.container}>
```

### Spacing

React Bootstrap spacing is a utility that assigns responsive margin or padding classes to elements to modify their display position.

The classes are named using the format {property}{sides}-{size} for xs and {property}{sides}-{breakpoint}-{size} for sm, md, lg, and xl.

Where property is one of:

> * m - for classes that set margin
> * p - for classes that set padding

Where sides is one of:

> * t - for classes that set margin-top or padding-top
> * b - for classes that set margin-bottom or padding-bottom
> * l - for classes that set margin-left or padding-left
> * r - for classes that set margin-right or padding-right
> * x - for classes that set both \*-left and \*-right
> * y - for classes that set both \*-top and \*-bottom
> * blank - for classes that set a margin or padding on all 4 sides of the element

Where breakpoint is one of:

> * sm
> * md
> * lg
> * xl

Where size is one of:

> * 0 - for classes that eliminate the margin or padding by setting it to 0
> * 1
> * 2
> * 3
> * 4
> * 5

For example:

```jsx
<img className="ml-2 mr-2" />
```

It means `marginLeft` is 2 and `marginRight` is 2 as well.

```jsx
<img className="m-4" />
```

It means margins of all sides \(left, right, top, bottom\) are 4.

### LinkContainer

`<LinkContainer>` is a component of [react-router-bootstrap](https://github.com/react-bootstrap/react-router-bootstrap). Wrap your React Bootstrap element in a `<LinkContainer>` to make it behave like a React Router `<Link>` `<LinkContainer>` accepts same parameters as React Router’s `<NavLink>`

