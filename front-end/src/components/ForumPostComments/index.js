import React from 'react';
import moment from 'moment';
import s from './styles.css';

class ForumPostComments extends React.Component {
  showComments(comments) {
    return comments.map((comment, index) => {
      return (
        <div>
          <div className={s['post-comment']}>{comment.responses}</div>
          <div className={s['comment-details']}>
            <div>Answer from {comment.nickname}</div>
            <div>
              Answered on{' '}
              {comment.created_at &&
                moment(comment.created_at).format('MM/DD/YYYY')}
            </div>
          </div>
          <svg height="2" width="100%">
            <line
              x1="100%"
              x2="0%"
              style={{ stroke: '#cfd8dc', strokeWidth: 2 }}
            />
          </svg>
        </div>
      );
    });
  }
  render() {
    const { comments } = this.props;
    return <div>{this.showComments(comments)}</div>;
  }
}

export default ForumPostComments;
