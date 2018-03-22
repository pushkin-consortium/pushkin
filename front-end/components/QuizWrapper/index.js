import React from 'react';
import ListenerQuiz from '../../experiments/listener-quiz';

import PropTypes from 'prop-types';

class QuizWrapper extends React.Component {
  render() {
    return (
      <div>
        {this.props.userInfo.profile && (
          <ListenerQuiz
            user={this.props.userInfo.profile}
            mountCurrentQuestion={this.props.mountCurrentQuestion}
            setCount={this.props.setCount}
            dispatchTempResponse={this.props.dispatchTempResponse}
          />
        )}
      </div>
    );
  }
}
QuizWrapper.propTypes = {
  userInfo: PropTypes.object.isRequired,
  form: PropTypes.object.isRequired
};
export default QuizWrapper;
