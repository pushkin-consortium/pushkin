import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getUserInfo } from '../../actions/userinfo';

import {
  fetchAllPosts,
  deletePost,
  getComments,
  deleteComment
} from '../../actions/forum';
import { Table, Button, Tabs, Tab } from 'react-bootstrap';
import baseUrl from '../../core/baseUrl';

class Admin extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  componentDidMount() {
    this.props.fetchAllPosts();
    this.props.getUserInfo();
    this.props.getComments();
  }
  handleDeletePost(post) {
    if (window.confirm('Are You sure you want to delete this post')) {
      this.props.deletePost(post);
    }
  }
  handleDeleteComment(comment) {
    if (window.confirm('Are You sure you want to delete this comment')) {
      this.props.deleteComment(comment);
    }
  }
  render() {
    const { posts, comments, isAdmin } = this.props;
    if (isAdmin) {
      return (
        <Tabs defaultActiveKey={'posts'} id="admin_panel">
          <Tab eventKey="posts" title="Posts">
            <Table striped bordered condensed hover>
              <thead>
                <th>Subject</th>
                <th>Quiz</th>
                <th />
              </thead>
              <tbody>
                {posts.map(post => {
                  return (
                    <tr key={post.id}>
                      <td>
                        <a href={`${baseUrl}/forum/posts/${post.id}`}>
                          {post.post_subject}
                        </a>
                      </td>
                      <td>{post.quiz || 'none'}</td>
                      <td>
                        <Button
                          bsStyle="danger"
                          bsSize="xsmall"
                          onClick={this.handleDeletePost.bind(this, post)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="comments" title="Comments">
            <Table striped bordered condensed hover>
              <thead>
                <th>Subject</th>
                <th>Quiz</th>
                <th />
              </thead>
              <tbody>
                {comments.map(comment => {
                  const post = posts.find(post => post.id == comment.post_id);
                  return (
                    <tr key={comment.id}>
                      <td style={{ textOverflow: 'elipsis' }}>
                        <a href={`${baseUrl}/forum/posts/${comment.post_id}`}>
                          {comment.responses.slice(0, 30)}
                        </a>
                      </td>
                      <td>{post.quiz || 'none'}</td>
                      <td>
                        <Button
                          bsStyle="danger"
                          bsSize="xsmall"
                          onClick={this.handleDeleteComment.bind(this, comment)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Tab>
        </Tabs>
      );
    } else {
      return <p>Not Authorized</p>;
    }
  }
}

Admin.propTypes = {
  posts: PropTypes.array,
  comments: PropTypes.array,
  fetchAllPosts: PropTypes.func,
  getUserInfo: PropTypes.func,
  deletePost: PropTypes.func,
  deleteComment: PropTypes.func,
  getComments: PropTypes.func,
  isAdmin: PropTypes.bool.isRequired
};

const mapStateToProps = state => ({
  posts: state.forum.posts,
  comments: state.forum.comments,
  isAdmin: state.userInfo.profile
    ? state.userInfo.profile.groups.indexOf('Admin') > -1
    : false
});

const mapDispatchToProps = {
  fetchAllPosts,
  getUserInfo,
  deletePost,
  getComments,
  deleteComment
};
export default connect(mapStateToProps, mapDispatchToProps)(Admin);
