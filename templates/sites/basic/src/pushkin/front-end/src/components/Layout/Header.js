// ./src/components/Layout/Navigation.js

import React, { Fragment, useEffect } from 'react';
import { LinkContainer } from 'react-router-bootstrap';

//redux
import { connect } from 'react-redux';
import { getUser, setUserID } from '../../actions/userInfo';

//styling
import { Nav, Navbar, Button, Image } from 'react-bootstrap';

//other
import { CONFIG } from '../../config';

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

const Header = (props) => {
  const isAuthenticated = false;
  const user = null;

  useEffect(() => {
    props.dispatch(getUser(isAuthenticated, user));
  }, [isAuthenticated]);

  return (
    <Navbar
      className="navbar-dark bg-dark"
      expand="lg"
      style={{ fontSize: '22px' }}
    >
      <LinkContainer to="/">
        <Navbar.Brand style={{ fontSize: '22px' }}>
          <Image
            className="mr-2 left"
            src={require('../../assets/images/logo/NavbarLogo.png')}
            width="30"
            height="30"
          />
          {CONFIG.whoAmI}
        </Navbar.Brand>
      </LinkContainer>
      <Navbar.Toggle />
      <Navbar.Collapse>
        <Nav className="mr-auto">
          <LinkContainer to="/">
            <Nav.Link>Quizzes</Nav.Link>
          </LinkContainer>
          <LinkContainer to="/findings">
            <Nav.Link>Findings</Nav.Link>
          </LinkContainer>
          <LinkContainer to="/about">
            <Nav.Link>About</Nav.Link>
          </LinkContainer>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default connect(mapStateToProps)(Header);
