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