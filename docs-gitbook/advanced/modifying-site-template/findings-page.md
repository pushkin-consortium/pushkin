# Findings Page

## Add a Findings Card

To add a card in the findings page, open `FindingsData.js` located in `components/Findings`. You should see an array of objects that looks like this:

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

You can edit five of the properties: **title**, **image**, **description**, **link**, and **url** in each object, in order to change the content in each findings card. You can add more by copy and pasting from { through }, making sure that you have a comma after } any time there is another { following.

To add a external link, set link property to `true` and fill the url property. Then a Read More button will appear in the findings card.

## CardGroup

The `<CardGroup>` component renders cards as a single, attached element with equal width and height columns. We wrapped card components in `<CardGroup>` inside a `<Container>` in findings page.

## Align Card Vertically in CardGroup

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

