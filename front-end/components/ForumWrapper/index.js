import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';

import Modal from '../PopupModal/model';
import QuizForum from '../QuizForum/index';
import { makePost } from '../../actions/forum';
import {
  sendTempResponse,
  sendTempStimulusResponse
} from '../../actions/tempResponse';
import {
  isAuthenticated,
  login,
  checkLogin,
  getUserInfo,
  generateAnonymousUser
} from '../../actions/userinfo';
import { last } from 'lodash'

import s from './styles.css';

// Takes a specific quiz, and a config

// the Component it you pass it has access to following props:
// The most important of these is calling mountCurrentQuestion with the current Question the user is on
// this syncs in with the Forum and allows the forum to track which question this refers too
// config={config}
// showPopup={this.openModal}
// mountCurrentQuestion={this.mountCurrentQuestion}
// setCount={this.setCount}
// dispatchTempResponse={this.dispatchTempResponse}

const withForum = (Quiz, quiz_name, config) => {
  return connect(state => state)(
    class extends Component {
      constructor(props) {
        super(props);
        this.state = {};
      }
      componentDidMount() {
        this.showProfile();
      }
      componentWillUnmount() {
        this.props.dispatch(sendTempResponse([]));
        this.props.dispatch(sendTempStimulusResponse([]));
        localStorage.removeItem('tempUser');
      }
      openModal = () => {
        this.setState({ isModalOpen: true });
      };
      mountCurrentQuestion = data => {
        this.setState({ currentQuestion: data });
      };
      showQuizPopUp = () => {
        if (!isAuthenticated()) {
          return (
            <Modal isOpen={this.state.isModalOpen}>
              <div className={s['modal-content']}>
                <h4 style={{ textAlign: 'center' }}>
                  There are many benefits after logging in, please
                  <a style={{ cursor: 'pointer' }} onClick={login}>
                    Log In/Sign up
                  </a>
                </h4>
                <div className={s['modal-close']}>
                  <Button onClick={this.closeModal}>Close</Button>
                </div>
              </div>
            </Modal>
          );
        }
      };
      closeModal = () => {
        this.setState({ isModalOpen: false, count: 0 });
      };
      dispatchCheckLogin = () => {
        this.props.dispatch(checkLogin());
      };
      setCount = () => {
        if (!isAuthenticated()) {
          this.setState({ count: this.state.count + 1 });
        }
      };
      showProfile = () => {
        if (isAuthenticated()) {
          this.props.dispatch(getUserInfo());
        } else {
          this.props.dispatch(generateAnonymousUser());
        }
      };
      dispatchTempResponse = (response, item) => {
        if (!isAuthenticated()) {
          if (item) {
            this.props.dispatch(sendTempStimulusResponse(response));
          } else {
            this.props.dispatch(sendTempResponse(response));
          }
        }
      };
      makeForumPost = (post, cb) => {
        const submitURL = _.last(window.location.pathname.split('/')) + '/stimulusResponse'
        post.stim.submitURL = submitURL;
        this.props.dispatch(makePost(post, cb));
      };
      render() {
        return (
          <div>
            {config.auth && <div>{this.showQuizPopUp()}</div>}
            <div>
              <Quiz
                {...this.props}
                config={config}
                showPopup={this.openModal}
                mountCurrentQuestion={this.mountCurrentQuestion}
                setCount={this.setCount}
                dispatchTempResponse={this.dispatchTempResponse}
              />
            </div>
            <div>
              {config.auth && <div>{this.showQuizPopUp()}</div>}
              {config.forum &&
                this.state.currentQuestion && (
                  <QuizForum
                    currentQuestion={this.state.currentQuestion}
                    user={this.props.userInfo.profile}
                    checkLogin={this.dispatchCheckLogin}
                    login={login}
                    makeForumPost={this.makeForumPost}
                    isAuthenticated={isAuthenticated}
                    formData={this.props.form}
                    quiz={quiz_name}
                    handleLocalPostChange={() => {
                      console.log('handle local post change');
                    }}
                  />
                )}
              {!this.props.userInfo.profile && (
                <p>
                  <b>Loading...</b>
                </p>
              )}
            </div>
          </div>
        );
      }
    }
  );
};
export default withForum;
