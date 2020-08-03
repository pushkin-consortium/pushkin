# About Page

The about page is wrapped in a fluid `Container` component, which is a full width container, spanning the entire width of the viewport.

## Card Image Overlays

The `<Card.ImgOverlay>` component turns an image into a card background and overlay your card’s text:

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

## Add a Team Member In About Page

To add a team member in the about page, open `People.js` located in `components/TeamMember`, it should be an array of objects look like this:

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

Each object contains three properties: name, image and description. Edit the name and description properties in `People.js`.

To add a profile picture of the team member. Copy the image file into the `assets/images/teamMember` folder.

Then edit the image property in `People.js`, making sure the name of the image file and the image property here match, including the extension name, like: `bob.jpg`.

