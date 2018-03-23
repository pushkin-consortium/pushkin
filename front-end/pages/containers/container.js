import React, { Component } from 'react';
import Layout from '../../components/Layout/Layout';
import { Button } from 'react-bootstrap';

import { connect } from 'react-redux';
import s from './container.css';
// import injectTapEventPlugin from 'react-tap-event-plugin';
// injectTapEventPlugin();
class Container extends Component {
  render() {
    const { auth, showForum } = this.props;
    if (auth) {
      const isAdmin =
        this.props.userInfo &&
        this.props.userInfo.profile &&
        this.props.userInfo.profile.groups &&
        this.props.userInfo.profile.groups.indexOf('Admin') > -1;
      return (
        <Layout auth={auth} showForum={showForum} isAdmin={true}>
          <div className={'container ' + s.wrap}>{this.props.children}</div>
        </Layout>
      );
    }
    return (
      <Layout showForum={showForum}>
        <div className={'container ' + s.wrap}>{this.props.children}</div>
      </Layout>
    );
  }
}
export default connect(state => state)(Container);
