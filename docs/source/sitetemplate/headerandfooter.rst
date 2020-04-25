.. _headerandfooter:

Header and Footer
==================

The ``Header.js`` and ``Footer.js`` components are located in ``pushkin/front-end/src/components/Layout``

Navbar
-------

Here’s what you need to know before getting started with the `Navbar Component <https://react-bootstrap.github.io/components/navbar/#navbars-overview>`_:

1. Use the ``expand`` prop to allow for collapsing the Navbar at lower breakpoints.
2. Navbars and their contents are fluid by default. Use optional containers to limit their horizontal width.
3. Use spacing and flex utilities to size and position content

Navbar logo
-----------

To Change the logo in the navbar, copy your logo image into the ``pushkin/front-end/src/assets/logo`` folder, modify the path in ``src={require("../../assets/images/logo/NavbarLogo.png")}`` in the ``<Navbar.Brand>``. You can also modify the logo's size using ``width`` and ``height`` attribute in the ``<img />`` tag.

Navbar Color Schemes
--------------------

Choose from ``variant="light"`` for use with light background colors, ``variant="dark"`` for dark background colors. Then, customize with the ``bg`` prop or any custom css! You can also use the ``className`` prop in the ``<Navbar>`` component, like ``className="navbar-dark bg-dark"``
