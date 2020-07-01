# Findings Page

### Add a Findings Card

To add a card in the findings page, open `FindingsData.js` located in `components/Findings`, it should be an array of objects look like this:

```javascript
const findingsData = [
  {
    title: 'Englishes of the World',
    image: 'EnglishesOfTheWorld.jpg',
    description: 'How do your grammar intuitions depend on when and where you learned English? Participants took a short grammar quiz, which we are using to understand how grammar differs in different parts of the English-speaking world (USA, Ireland, Australia, etc.). We are also investigating how grammar is different for people who learn English later in life: Do they make different mistakes if their first language is German as opposed to Japanese?',
    link: true,
    url: 'https://www.google.com/',
  },
  {
    title: 'The king frightened the page because he...',
    image: 'FrightenedKing.jpeg',
    description: 'This experiment was one in a line of pronoun experiments, most of which were run on Amazon Mechanical Turk. Early summaries of the findings can be found here and here. This experiment was bundled into a larger paper on pronouns which will be published somewhere in 2013/2014. You can read a description of the paper, and find a link to the paper here.',
    link: false,
    url: '',
  },
  {
    title: 'Birth Order and Love',
    image: 'BirthOrder.jpeg',
    description: "Pop psychology assures us that your birth order (oldest, middle, youngest, only) has a major effect on your personality. Many books have been written on the subject. It might surprise you, then, that scientists are not only not sure how birth order affects personality, they are divided on the question of whether birth order has any effect on personality. In this study, we asked people about their own birth order and the birth order of their best friends and significant others, as well as the birth order of their parents. It turns out that people are slightly more likely to have a close friend or significant other/spouse of the same birth order. We think this suggests that birth order does in fact affect personality, though no doubt the debate will continue. It's important that the method we used -- especially the use of the Internet -- avoided some of the typical confounds of birth order studies.",
    link: false,
    url: '',
  },
]
```

You can edit the five properties: title, image, description, link and url in each object, in order to change the content in each findings card.

To add a external link, set link property to `true` and fill the url property. Then a Read More button will appear in the findings card.

### CardGroup

The `<CardGroup>` component renders cards as a single, attached element with equal width and height columns. We wrapped card components in `<CardGroup>` inside a `<Container>` in findings page.

### Align Card Vertically in CardGroup

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

