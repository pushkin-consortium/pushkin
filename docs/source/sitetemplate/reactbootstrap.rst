.. _reactbootstrap:

React Bootstrap
===============

The pushkin site template uses `React-Bootstrap <https://react-bootstrap.github.io/>`_ as its front end UI library. It is a complete re-implementation of the Bootstrap components using React. It has no dependency on either bootstrap.js or jQuery.

Import Libraries
----------------

You should import individual components like: ``react-bootstrap/Button`` rather than the entire library. Doing so pulls in only the specific components that you use, which can significantly reduce the amount of code you end up sending to the client:

.. code-block:: javascript

  import Button from 'react-bootstrap/Button';

  // or less ideally
  import { Button } from 'react-bootstrap';

Inline Styling
--------------

In React, inline styles are not specified as a string. Instead they are specified with an object whose key is the camelCased version of the style name, and whose value is the style's value, usually a string:

.. code-block:: javascript

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

React lets you add CSS inline, written as attributes and passed to elements:

.. code-block:: javascript

  <Container className="p-0" fluid style={styles.container}>

Spacing
--------

React Bootstrap spacing is a utility which assigns responsive margin or padding classes to elements to modify its display position.

The classes are named using the format `{property}{sides}-{size}` for xs and `{property}{sides}-{breakpoint}-{size}` for sm, md, lg, and xl.

Where property is one of:

  - m - for classes that set margin
  - p - for classes that set padding

Where sides is one of:

  - t - for classes that set margin-top or padding-top
  - b - for classes that set margin-bottom or padding-bottom
  - l - for classes that set margin-left or padding-left
  - r - for classes that set margin-right or padding-right
  - x - for classes that set both *-left and *-right
  - y - for classes that set both *-top and *-bottom
  - blank - for classes that set a margin or padding on all 4 sides of the element

Where breakpoint is one of:

  - sm
  - md
  - lg
  - xl

Where size is one of:

  - 0 - for classes that eliminate the margin or padding by setting it to 0
  - 1
  - 2
  - 3
  - 4 
  - 5

For example:

.. code-block:: javascript

  <img className="ml-2 mr-2" />

It means ``marginLeft`` is 2 and ``marginRight`` is 2 as well.

.. code-block:: javascript

  <img className="m-4" />

It means margins of all sides (left, right, top, bottom) are 4.

LinkContainer
--------------

``<LinkContainer>`` is a component of `react-router-bootstrap <https://github.com/react-bootstrap/react-router-bootstrap>`_. Wrap your React Bootstrap element in a ``<LinkContainer>`` to make it behave like a React Router ``<Link>`` ``<LinkContainer>`` accepts same parameters as React Router's ``<NavLink>``