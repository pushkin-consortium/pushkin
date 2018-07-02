import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router';
import s from './styles.css';
import moment from 'moment';
import { Panel } from 'react-bootstrap';

class ForumContent extends React.Component {
  showAllPosts = () => {
    return this.props.posts.map(post => {
      return (
        <Panel key={post.id} className={s.panel}>
          <div>
            <Link to={`/forum/posts/${post.id}`}>
              <h3 className={s.title}>{post.post_subject}</h3>
            </Link>
            {post.quiz && <div className={s['quiz-tag']}>{post.quiz}</div>}
            {!post.quiz && (
              <div className={s['quiz-tag']} style={{ background: 'tomato' }}>
                general
              </div>
            )}
          </div>
          <hr />
        </Panel>
      );
    });
  };
  render() {
    return <div>{this.showAllPosts()}</div>;
  }
}
ForumContent.propTypes = {
  posts: PropTypes.array
};

export default ForumContent;
