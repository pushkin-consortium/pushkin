import React from 'react';
import { Field, reduxForm } from 'redux-form';
import s from './styles.css';
import { Button } from 'react-bootstrap';
import NativeListener from 'react-native-listener';

const PostReplyForm = props => {
  const {
    handleSubmit,
    user,
    data,
    formData,
    post_id,
    reset,
    handleLocalComment
  } = props;
  const handleButtonClick = event => {
    if (Number(event.key) < 10) {
      event.stopPropagation();
    }
  };
  console.log('slkjdfls', props);
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        handleSubmit(
          {
            auth0_id: user.auth0_id,
            responses: formData.postReply.values.post_reply,
            created_at: new Date(),
            post_id: post_id
          },
          handleLocalComment
        );
        reset();
      }}
    >
      <div>
        <div>
          <NativeListener onKeyDown={handleButtonClick}>
            <Field
              className={s['reply-textarea']}
              name="post_reply"
              component="textarea"
            />
          </NativeListener>
        </div>
      </div>
      <div>
        <Button className="btn btn-success" type="submit">
          Submit
        </Button>
      </div>
    </form>
  );
};

export default reduxForm({
  form: 'postReply'
})(PostReplyForm);
