import React from 'react';
import Modal from '../PopupModal/model';
import { Button } from 'react-bootstrap';
import SimpleForm from '../PostForm/form';
import s from './styles.css';
import PropTypes from 'prop-types';

class QuizForum extends React.Component {
  constructor(props) {
    super(props);
    this.props.checkLogin();
    this.state = { isModalOpen: false, post: {} };
  }
  openModal = () => {
    this.setState({ isModalOpen: true });
  };
  closeModal = () => {
    this.setState({ isModalOpen: false });
  };
  handleOnSubmit = (data, cb) => {
    this.props.makeForumPost(data, () => {
      this.closeModal();
      this.props.handleLocalPostChange();
    });
  };
  showLogInLink = () => {
    const { user, currentQuestion, isAuthenticated, fromForum } = this.props;
    const authenticated = isAuthenticated()
    if (!authenticated) {
      if (fromForum) {
        return (
          <h4 style={{ textAlign: 'center' }}>
            Please{' '}
            <a style={{ cursor: 'pointer' }} onClick={this.props.login}>
              Log In{' '}
            </a>
            to ask a question on the forum.
          </h4>
        );
      } else {
        if (typeof currentQuestion.question.stimulus != undefined) {
          return (
            <h4 style={{ textAlign: 'center' }}>
              Please{' '}
              <a style={{ cursor: 'pointer' }} onClick={this.props.login}>
                Log In{' '}
              </a>
              to ask a question on the forum.
            </h4>
          );
        }
      }
    }
    return (
      <div>
        {!currentQuestion &&
          fromForum && (
            <Button
              className="btn btn-primary"
              onClick={() => this.openModal()}
            >
              Post a new question
            </Button>
          )}
        {currentQuestion &&
          currentQuestion.question.prompt && (
            <Button
              className="btn btn-primary"
              onClick={() => this.openModal()}
            >
              Ask a question
            </Button>
          )}
        <Modal isOpen={this.state.isModalOpen}>
          <div style={{ margin: 10 }}>
            <SimpleForm
              data={currentQuestion}
              formData={this.props.formData}
              user={user}
              onSubmit={this.handleOnSubmit}
              close={this.closeModal}
              fromForum={fromForum}
              handleLocalPostChange={this.props.handleLocalPostChange}
              quiz={this.props.quiz}
            />
          </div>
        </Modal>
      </div>
    );
  };
  render() {
    return (
      <div
        className={this.props.fromForum ? s['post-button'] : 'styles_blurb_3jf'}
      >
        {this.showLogInLink()}
      </div>
    );
  }
}
QuizForum.propTypes = {
  fromForum: PropTypes.bool,
  quiz: PropTypes.string,
  user: PropTypes.object,
  isAuthenticated: PropTypes.func,
  currentQuestion: PropTypes.object,
  handleLocalPostChange: PropTypes.func,
  formData: PropTypes.object,
  makeForumPost: PropTypes.func,
  checkLogin: PropTypes.func
};
export default QuizForum;
