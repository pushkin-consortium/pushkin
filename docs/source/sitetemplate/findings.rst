.. _findings:

Findings Page
==============

CardGroup
----------

The ``<CardGroup>`` component renders cards as a single, attached element with equal width and height columns. We wrapped card components in ``<CardGroup>`` inside a ``<Container>`` in findings page.

Align Card Vertically in CardGroup
-----------------------------------

Use two ``<Col>`` components wrapped in one ``<Row>`` inside cards:

.. code-block:: javascript

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

The content in the first ``<Col>`` will be on the left side of the card. And the content in the second ``<Col>`` will be on the right side of the card. 

For example, the first card in the findings page has its ``<Card.Img>`` in the first ``<Col>``, ``<Card.Body>``, ``<Card.Title>``, ``<Card.Text>`` in the second ``<Col>``

Accordion
----------

You can use `Accordion <https://react-bootstrap.github.io/components/accordion/>`_ component to collapse part of the card text in case the text is too long.

Wrap the ``<Card>`` component inside a ``<Accordion>`` component:

.. code-block:: javascript

  <Accordion defaultActiveKey="0">
    <Card>
      ...
    </Card>
  </Accordion>

The ``defaultActiveKey`` prop the default active key that is expanded on start. ``0`` stands for collapse by default, ``1`` stands for expand by default.

Wrap the card text that you want to hide before clicking the ``Read More`` button in ``<Accordion.Collapse>`` component:

.. code-block:: javascript

  <Accordion.Collapse eventKey="1">
    <Card.Text>...</Card.Text>
  </Accordion.Collapse>

Then add a ``<Accordion.Toggle>`` component as the ``Read More`` toggle button:

.. code-block:: javascript

  <Accordion.Toggle eventKey="1" style={styles.accordionCollapse}>Read More</Accordion.Toggle>

The ``eventKey`` prop is a key that corresponds to the toggler that triggers this collapse's expand or collapse. 

You can also change the styles of the toggle button by changing the ``accordionCollapse`` in the ``styles`` const, adding a button component that linked to external website and so on.