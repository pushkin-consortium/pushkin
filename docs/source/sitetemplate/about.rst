.. _about:

About Page
===========

The about page is wrapped in a `fluid` ``Container`` component, which is a full width container, spanning the entire width of the viewport.

Card Image Overlays
--------------------

The ``<Card.ImgOverlay>`` component turns an image into a card background and overlay your card’s text:

.. code-block:: javascript

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

Team Members
-------------

Each team member is in a ``<Card>`` component. We put every three cards inside one ``<CardDeck>`` component in a row.

To change the picture of the card, add images to the ``pushkin/front-end/src/assets/images/profile`` folder, and change the src prop of ``<Card.Img src={require("../assets/images/profile/xxx.png")} />`` to the right path.

Adding cards to CardDeck that are less than three
---------------------------------------------------

If want to put one or two cards in a ``<CardDeck>``, for example, you have 5 team members, so you need to put first three cards in the first ``<CardDeck>`` and last two cards in the second ``<CardDeck>``.

By default, the cards in the card decks are same width and same height. If you have only one or two cards in a ``<CardDeck>``, each card will widen and fill the card deck, which will cause some problems like distort the card images.

To solve this, you can simply modify the style prop in the ``<Card>`` component, set a fixed width for those cards in the card deck. We suggest that fixed width is around ``22rem``:

.. code-block:: javascript

  <Card style={{backgroundColor: '#B7E0F2', borderRadius: 55, minWidth:'22rem', maxWidth:'22rem'}}>
    ...
  </Card>

Or you can try `CardColumns <https://react-bootstrap.netlify.app/components/cards/#card-columns>`_ component instead of CardDeck!