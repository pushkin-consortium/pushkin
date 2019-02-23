import React from 'react';
import { Link } from 'react-router';
import s from './styles.css';

class DashboardForum extends React.Component {
  constructor(props) {
    super(props);
    this.state = { postIds: null };
  }
  componentDidMount() {
    this.props.getUserPostIds(this.props.user)
  }
  showLinks(posts) {
    return posts.map(post => {
      return (
        <div className={s['question-container']}>
          {post.quiz && (
            <div className={s['quiz-tag']} style={{ background: 'lightblue' }}>
              {post.quiz}
            </div>
          )}
          {!post.quiz && (
            <div className={s['quiz-tag']} style={{ background: 'tomato' }}>
              general
            </div>
          )}
          <div>
            <Link to={`/forum/posts/${post.id}`}>
              <h4>{post.post_subject}</h4>
            </Link>
          </div>
        </div>
      );
    });
  }
  render() {
    return (
      <div>
        <h3>Attended forum posts</h3>
        <div>{this.props.posts && this.showLinks(this.props.posts)}</div>
      </div>
    );
  }
}
export default DashboardForum;
