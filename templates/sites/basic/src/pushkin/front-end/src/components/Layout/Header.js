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
import LoginButton from '../Authentication/Login';
import LogoutButton from '../Authentication/Logout';
import { useAuth0 } from "@auth0/auth0-react";

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

const Header = (props) => {
  // Use Auth0 if enabled, otherwise fall back to session-based auth
  let isAuthenticated = false;
  let user = null;
  let isLoading = false;

  if (CONFIG.useAuth && CONFIG.authDomain && CONFIG.authClientID) {
    const auth0Data = useAuth0();
    isAuthenticated = auth0Data.isAuthenticated;
    user = auth0Data.user;
    isLoading = auth0Data.isLoading;
  }

  useEffect(() => {
    if (!isLoading) {
      props.dispatch(getUser(isAuthenticated, user));
    }
  }, [isAuthenticated, isLoading, user, props]);

  if (isLoading) {
    return null; // or a loading spinner if preferred
  }

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
          {CONFIG.useAuth && isAuthenticated ?
            <LinkContainer to="/profile">
              <Nav.Link>My account</Nav.Link>
            </LinkContainer>
          : null}
        </Nav>
        {CONFIG.useAuth && (
          <Nav className="ml-auto">
            <Nav.Item>
              {isAuthenticated ? <LogoutButton /> : <LoginButton />}
            </Nav.Item>
          </Nav>
        )}
      </Navbar.Collapse>
    </Navbar>
  );
};

export default connect(mapStateToProps)(Header);
