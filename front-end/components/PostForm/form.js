import React from 'react';
import { Field, reduxForm } from 'redux-form';
import { Button } from 'react-bootstrap';
import s from './styles.css';
import NativeListener from 'react-native-listener';
import { connect } from 'react-redux';

const SimpleForm = props => {
  const {
    handleSubmit,
    data,
    formData,
    fromForum,
    handleLocalPostChange,
    quiz
  } = props;
  console.log(props);
  const handleButtonClick = event => {
    if (Number(event.key) < 10) {
      event.stopPropagation();
    }
  };
  return (
    <form onSubmit={handleSubmit} className={s['post-form']}>
      {!fromForum && (
        <div>
          <label>
            Post a question about {quiz} Q{data.question.trial_index}
          </label>
        </div>
      )}
      <div>
        <label>Subject</label>
        <div>
          <NativeListener onKeyDown={handleButtonClick}>
            <Field
              name="post_subject"
              component="input"
              type="text"
              placeholder="enter a subject"
            />
          </NativeListener>
        </div>
      </div>
      <div>
        <label>Content</label>
        <div>
          <NativeListener onKeyDown={handleButtonClick}>
            <Field name="post_content" component="textarea" />
          </NativeListener>
        </div>
      </div>
      <div className={s['button-container']}>
        <Button className="btn btn-danger" onClick={props.close}>
          Close
        </Button>
        <Button className="btn btn-success" type="submit">
          Submit
        </Button>
      </div>
    </form>
  );
};

let fromStateForm = reduxForm({
  form: 'simple' // a unique identifier for this form
})(SimpleForm);

export default connect((state, ownProps) => ({
  initialValues: {
    auth0_id: ownProps.user.auth0_id,
    stim: ownProps.data || null,
    quiz: ownProps.quiz || null
  }
}))(fromStateForm);
