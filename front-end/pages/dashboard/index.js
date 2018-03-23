import React from 'react';
import { connect } from 'react-redux';

import DashboardNav from '../../components/DashboardNav/index';
import s from './styles.css';
import DashboardForum from '../../components/DashboardForum/index';
import DashboardProfile from '../../components/DashboardProfile/index';
import baseUrl from '../../core/baseUrl';

import {
  checkLogin,
  login,
  logout,
  isAuthenticated,
  getUserInfo,
  updateUser,
  resetPassword,
  loginLocation
} from '../../actions/userinfo';
import { getUserPostIds } from '../../actions/forum';
class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      profile: null,
      section: null
    };
    this.dispatchCheckLogin();
  }
  dispatchCheckLogin = () => {
    this.props.dispatch(loginLocation('/dashboard'));
    this.props.dispatch(checkLogin());
  };
  logout = () => {
    this.props.dispatch(logout());
  };
  resetPassword = email => {
    this.props.dispatch(resetPassword(email));
  };
  updateUser = (payload, userId) => {
    this.props.dispatch(updateUser(payload, userId));
  };
  componentWillMount() {
    this.showProfile();
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.userInfo.profile) {
      this.setState({ profile: nextProps.userInfo.profile });
    }
  }
  showProfile = () => {
    if (isAuthenticated() && !this.props.userInfo.profile) {
      this.props.dispatch(getUserInfo());
    }
  };
  updateLocalProfile = metaData => {
    let profile = {
      ...this.state.profile,
      user_metadata: metaData
    };
    this.setState({ profile });
  };
  setSection = section => {
    this.setState({ section });
  };
  showContent = () => {
    const { profile } = this.state;
    switch (this.state.section) {
      case 'profile':
        return (
          <DashboardProfile
            profile={profile.user_metadata}
            userId={profile.user_id}
            email={profile.email}
            logout={this.logout}
            resetPassword={this.resetPassword}
            updateUser={this.updateUser}
            showProfile={this.showProfile}
            updateLocalProfile={this.updateLocalProfile}
          />
        );
      case 'subscriptions':
        return <div>Subscriptions Coming soon ... </div>;
      case 'forum':
        return (
          <DashboardForum
            getUserPostIds={getUserPostIds}
            user={this.props.userInfo.profile.auth0_id}
            baseUrl={baseUrl}
          />
        );
      default:
        return (
          <DashboardProfile
            profile={this.props.userInfo.profile.user_metadata}
            userId={this.props.userInfo.profile.user_id}
            email={this.props.userInfo.profile.email}
            logout={this.logout}
            resetPassword={this.resetPassword}
            updateUser={this.updateUser}
            showProfile={this.showProfile}
            updateLocalProfile={this.updateLocalProfile}
          />
        );
    }
  };
  render() {
    const authenticated = isAuthenticated();
    const { profile } = this.props.userInfo;
    return (
      <div className="styles_blurb_3jf">
        {authenticated &&
          profile && (
            <div className={s['dashboard-nav']}>
              <div className={s.section}>
                <DashboardNav
                  setSection={this.setSection}
                  logOut={this.logout}
                  config={this.props.config}
                />
              </div>
              <div className={s.content}>{this.showContent()}</div>
            </div>
          )}
        {!authenticated && (
          <h4 style={{ textAlign: 'center' }}>
            Please{' '}
            <a style={{ cursor: 'pointer' }} onClick={login}>
              Log In{' '}
            </a>
            to view your dashboard.
          </h4>
        )}
      </div>
    );
  }
}

export default connect(state => state)(Dashboard);
