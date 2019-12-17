// ./src/components/Layout/Navigation.js

import React, { useEffect } from 'react';
import { Fragment } from 'react';
import { withRouter } from 'react-router-dom';

//redux
import { connect } from 'react-redux';
import { getUser, setUserID } from '../../actions/userInfo';

//stylin
import * as b from 'react-bootstrap';
//import * as i from 'react-social-icons';
import s from './Header.css';
//import l from './Layout.css';
import { LinkContainer } from 'react-router-bootstrap';
import Avatar from '../Avatar.js';

//other
import { CONFIG } from '../../config';
import { useAuth0 } from '../../utils/react-auth0-spa';

const mapStateToProps = state => {
  return {
    userID: state.userInfo.userID
  };
};

const Header = props => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  if (!CONFIG.useAuth) {
    const isAuthenticated = false;
    const user = null;
  }

  useEffect(() => {
    props.dispatch(getUser(isAuthenticated, user));
  }, [isAuthenticated]);

  return (
    <div id="App">
      <div id="head-wrap" className={s.gray}>
        <header className={s.header} id="header">
          <div className={s.navback}>
            <div className={s.navhead}>
              <b.Navbar bg="light" expand="lg">
                <LinkContainer to="/">
                  <b.Navbar.Brand>{CONFIG.whoAmI}</b.Navbar.Brand>
                </LinkContainer>
                <b.Navbar.Toggle aria-controls="basic-b.Navbar-b.Nav" />
                <b.Navbar.Collapse id="basic-b.Navbar-b.Nav">
                  <b.Nav className="mr-auto">
                    <LinkContainer to="/">
                      <b.Nav.Link>Quizzes</b.Nav.Link>
                    </LinkContainer>
                    <LinkContainer to="/About">
                      <b.Nav.Link>About</b.Nav.Link>
                    </LinkContainer>
                    {CONFIG.useAuth ? (
                      !isAuthenticated ? (
                        <Fragment>
                          <b.Button
                            onClick={() => loginWithRedirect({})}
                            variant="outline-success"
                          >
                            Login
                          </b.Button>
                        </Fragment>
                      ) : (
                        <Fragment>
                          <LinkContainer to="/Dashboard">
                            <b.Nav.Link>Dashboard</b.Nav.Link>
                          </LinkContainer>
                          <b.Button
                            onClick={() => {
                              logout();
                              props.dispatch(setUserID(null));
                            }}
                          >
                            Logout
                          </b.Button>
                          <Avatar />
                        </Fragment>
                      )
                    ) : null}
                    User={props.userID}
                  </b.Nav>
                </b.Navbar.Collapse>
              </b.Navbar>
            </div>
          </div>
        </header>

        {/*          <div
                id="head-placeholder"
                style={{ paddingBottom: this.state.headerHeight }}
              >
                {' '}
              </div> */}
      </div>
    </div>
  );
};

export default withRouter(connect(mapStateToProps)(Header));
