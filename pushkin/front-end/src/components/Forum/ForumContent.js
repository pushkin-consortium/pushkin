import React from 'react';
import PropTypes from 'prop-types';
// import { Link } from 'react-router';

import { Card } from 'react-bootstrap';

const styles = {
  title: {
    textTransform: 'capitalize'
  },
  card: {
    margin: '20px 0px',
    padding: '0px 20px'
  },
  quizTag: {
    width: 'fit-content',
    background: 'lightblue',
    padding: '5px',
    fontSize: '10px',
    background: 'tomato'
  }
};

class ForumContent extends React.Component {
  showAllPosts = () => {
    return this.props.posts.map(post => {
      return (
        <Card key={post.id} style={styles.card}>
          <div>
            {/* <Link to={`/forum/posts/${post.id}`}> */}
            <h3 style={styles.title}>{post.post_subject}</h3>
            {/* </Link> */}
            {post.quiz && <div>{post.quiz}</div>}
            {!post.quiz && <div style={styles.quizTag}>general</div>}
          </div>
          <hr />
        </Card>
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
