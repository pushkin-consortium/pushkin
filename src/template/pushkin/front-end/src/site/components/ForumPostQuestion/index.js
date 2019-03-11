import React from 'react';
import s from './styles.css';
import moment from 'moment';

class ForumPostQuestion extends React.Component {
  render() {
    const {
      quiz,
      subject,
      poster,
      content,
      created_at,
      quizQuestion,
      openQuestion
    } = this.props;
    return (
      <div>
        <div className={s['question-container']}>
          {quiz && <div className={s['quiz-tag']}>{quiz}</div>}
          {!quiz && (
            <div className={s['quiz-tag']} style={{ background: 'tomato' }}>
              general
            </div>
          )}
          <div>
            <h3 className={s['question-title']}>{subject}</h3>
          </div>
        </div>
        <div>
          <p>{content}</p>
          {quizQuestion && (
            <p>
              See the quiz question <a className={s.link} onClick={openQuestion}>here</a>
            </p>
          )}
        </div>
        <div className={s['question-details']}>
          <div>posted by: {poster || 'Anonymous'}</div>
          <div>created on: {moment(created_at).format('MM/DD/YYYY')}</div>
        </div>
      </div>
    );
  }
}

export default ForumPostQuestion;
