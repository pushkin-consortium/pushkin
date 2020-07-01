.. _headerandfooter:

Header and Footer
==================

The ``Header.js`` and ``Footer.js`` components are located in ``pushkin/front-end/src/components/Layout``

Navbar logo
-----------

To Change the logo in the navbar, copy your logo image into the ``pushkin/front-end/src/assets/logo`` folder, modify the path in ``src={require("../../assets/images/logo/NavbarLogo.png")}`` in the ``<Navbar.Brand>``. You can also modify the logo's size using ``width`` and ``height`` attribute in the ``<img />`` tag.

Navbar Color Schemes
--------------------

Choose from ``variant="light"`` for use with light background colors, ``variant="dark"`` for dark background colors. Then, customize with the ``bg`` prop or any custom css! You can also use the ``className`` prop in the ``<Navbar>`` component, like ``className="navbar-dark bg-dark"``

Footer
-------

The footer is wrapped in ``<Row>`` component. You can change the background color in the style prop: ``style={{backgroundColor:'#eeeeee'}}``.