import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { browserHistory } from 'react-router';
import s from './styles.css';
class DashboardNav extends Component {
  render() {
    const { setSection } = this.props;
    return (
      <div className={s['nav-item']}>
        <div onClick={() => setSection('profile')}>
          <i className="fa fa-user" aria-hidden="true" />
          Profile
        </div>
        {this.props.config.forum && (
          <div onClick={() => setSection('forum')}>
            <i className="fa fa-bookmark" aria-hidden="true" />
            Forum
          </div>
        )}
        <div onClick={this.props.logOut} className={s.logout}>
          <i className="fa fa-sign-out" aria-hidden="true" />
          Log Out
        </div>
      </div>
    );
  }
}

export default DashboardNav;
