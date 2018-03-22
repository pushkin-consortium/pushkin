import React from 'react';
import * as b from 'react-bootstrap';
import s from './Header.css';
import l from './Layout.css';
import { Link } from 'react-router';
import { LinkContainer } from 'react-router-bootstrap';

class Header extends React.Component {
  constructor() {
    super();
    this.state = { mobile: false };
    this.updateDimensions = this.updateDimensions.bind(this);
  }
  componentDidMount() {
    this.updateDimensions();
    window.addEventListener('resize', this.updateDimensions);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
  }

  home() {
    if (window.location.pathname.toString().split('/')[1] === '') {
      return true;
    } else {
      return false;
    }
  }
  showDashboardOrLogIn = (loggedIn, mobile) => {
    if (mobile) {
      if (loggedIn) {
        return <font className={s.navLinks}>Dashboard</font>;
      } else {
        return <font className={s.navLinks}>Log in</font>;
      }
    } else {
      if (loggedIn) {
        return <b.NavItem>Dashboard</b.NavItem>;
      } else {
        return <b.NavItem>Log In</b.NavItem>;
      }
    }
  };
  updateDimensions() {
    if (window.innerWidth < 768) {
      this.setState({ mobile: true });
    } else {
      this.setState({ mobile: false });
    }
  }

  render() {
    const { auth, showForum, isAdmin } = this.props;
    let loggedIn;
    if (auth) {
      loggedIn = auth.isAuthenticated();
    }
    if (this.home()) {
      return (
        <header id="header">
          <Link to="/paths">
            <div
              className={s.landing}
              style={{
                backgroundImage: `url(${require('../../img/logo_button-min.png')})`
              }}
            />
          </Link>
          <b.Image
            style={{ display: 'none' }}
            src={require('../../img/favicon.ico')}
          />
        </header>
      );
    } else if (this.state.mobile && !this.home()) {
      return (
        <header
          className={s.header}
          id="header"
          ref={node => (this.root = node)}
        >
          <b.Image
            src={require('../../img/gww_logo.png')}
            className={s.logo}
            style={{ marginTop: '5px', height: '90px' }}
          />
          <div className={s.navWrapper}>
            <b.Nav bsStyle="pills">
              <b.NavDropdown
                active
                title="Menu"
                style={{ padding: '3px', marginTop: '2px' }}
                id="bg-nested-dropdown"
              >
                <LinkContainer to="/paths">
                  <b.MenuItem>
                    <span className={s.navLinks}>Paths</span>
                  </b.MenuItem>
                </LinkContainer>
                <LinkContainer to="/projects">
                  <b.MenuItem>
                    <span className={s.navLinks}>Projects</span>
                  </b.MenuItem>
                </LinkContainer>
                <LinkContainer to="/quizzes">
                  <b.MenuItem>
                    <span className={s.navLinks}>Quizzes</span>
                  </b.MenuItem>
                </LinkContainer>
                <LinkContainer to="/findings">
                  <b.MenuItem>
                    <span className={s.navLinks}>Findings</span>
                  </b.MenuItem>
                </LinkContainer>
                <LinkContainer to="/about">
                  <b.MenuItem>
                    <span className={s.navLinks}>About</span>
                  </b.MenuItem>
                </LinkContainer>
                <b.MenuItem href="https://blog.gameswithwords.org/">
                  <span className={s.navLinks}>Blog</span>
                </b.MenuItem>
                {typeof loggedIn !== 'undefined' && (
                  <LinkContainer to="/dashboard">
                    <b.MenuItem>
                      {this.showDashboardOrLogIn(loggedIn, 'mobile')}
                    </b.MenuItem>
                  </LinkContainer>
                )}
                {showForum && (
                  <LinkContainer to="/forum">
                    <b.MenuItem>
                      <span className={s.navLinks}>Forum</span>
                    </b.MenuItem>
                  </LinkContainer>
                )}
                {isAdmin && (
                  <LinkContainer to="/admin">
                    <b.MenuItem>
                      <span className={s.navLinks}>Admin</span>
                    </b.MenuItem>
                  </LinkContainer>
                )}
              </b.NavDropdown>
            </b.Nav>
          </div>
        </header>
      );
    } else {
      return (
        <header
          className={s.header}
          id="header"
          ref={node => (this.root = node)}
        >
          {this.home() ? (
            <b.Image
              src={require('../../img/logo_square-min.png')}
              responsive
            />
          ) : (
            <b.Image
              src={require('../../img/gww_logo.png')}
              className={s.logo}
            />
          )}
          <b.Nav
            style={{
              margin: '0px',
              fontFamily: "'Ribeye Marrow', cursive",
              fontSize: '20px',
              backgroundColor: '#a9a9a9'
            }}
            bsStyle="tabs"
            justified
          >
            <LinkContainer to="/paths">
              <b.NavItem>Paths</b.NavItem>
            </LinkContainer>
            <LinkContainer to="/projects">
              <b.NavItem>Projects</b.NavItem>
            </LinkContainer>
            <LinkContainer to="/quizzes">
              <b.NavItem>Quizzes</b.NavItem>
            </LinkContainer>
            <LinkContainer to="/findings">
              <b.NavItem>Findings</b.NavItem>
            </LinkContainer>
            <LinkContainer to="/about">
              <b.NavItem>About</b.NavItem>
            </LinkContainer>
            <b.NavItem href="https://blog.gameswithwords.org/">Blog</b.NavItem>
            {typeof loggedIn !== 'undefined' && (
              <LinkContainer to="/dashboard">
                {this.showDashboardOrLogIn(loggedIn)}
              </LinkContainer>
            )}
            {showForum && (
              <LinkContainer to="/forum">
                <b.NavItem>Forum</b.NavItem>
              </LinkContainer>
            )}
            {isAdmin && (
              <LinkContainer to="/admin">
                <b.NavItem>Admin</b.NavItem>
              </LinkContainer>
            )}
          </b.Nav>
        </header>
      );
    }
  }
}

export default Header;
