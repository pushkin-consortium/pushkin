import React, { PropTypes } from 'react';
import cx from 'classnames';
import Header from './Header';
import Footer from './Footer';
import * as b from 'react-bootstrap';
import s from './Layout.css';

class Layout extends React.Component {
  render() {
    const { auth, showForum, isAdmin } = this.props;
    if (auth) {
      return (
        <div>
          <Header auth={auth} showForum={showForum} isAdmin={isAdmin} />
          {this.props.children}
          <Footer />
        </div>
      );
    }
    return (
      <div>
        <Header showForum={showForum} />
        {this.props.children}
        <Footer />
      </div>
    );
  }
}

export default Layout;
