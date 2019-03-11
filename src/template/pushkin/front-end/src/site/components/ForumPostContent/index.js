import React from 'react';
import { connect } from 'react-redux';

import { getOnePost, makeComment } from '../../actions/forum';
import { getUserInfo, isAuthenticated } from '../../actions/userinfo';
import PostReplyForm from '../ForumPostReply';
import ForumPostQuestion from '../ForumPostQuestion';
import ForumPostComments from '../ForumPostComments';
import StaticQuestionContainer from '../StaticQuestionContainer';

import Loading from '../Loading';
import s from './styles.css';

class ForumQuestion extends React.Component {
  constructor(props) {
    super(props);
    this.state = { data: null, openQuestion: false };
  }
  componentWillMount() {
    this.props.dispatch(getUserInfo());
  }
  componentDidMount() {
    this.props.dispatch(getOnePost(this.props.params.id))
  }
  createComment = (data, cb) => {
    this.props.dispatch(makeComment(data, cb));
  };
  openQuestion = () => {
    this.setState({ openQuestion: true });
  };
  closeQuestion = () => {
    this.setState({ openQuestion: false });
  };
  render() {
    const { userInfo, formData, comment, post } = this.props;
    return (
      <div style={{ display: 'flex' }}>
        {!post && <Loading />}
        {post && (
          <div style={{ width: '50%' }}>
            <ForumPostQuestion
              subject={post.post_subject}
              content={post.post_content}
              quizQuestion={post.stim}
              poster={post.nickname}
              created_at={post.created_at}
              quiz={post.quiz}
              openQuestion={this.openQuestion}
            />
            <svg height="2" width="100%">
              <line
                x1="100%"
                x2="0%"
                style={{ stroke: '#cfd8dc', strokeWidth: 2 }}
              />
            </svg>
            <ForumPostComments comments={post.forumComments || []} />
            {isAuthenticated() && (
              <PostReplyForm
                handleSubmit={this.createComment}
                user={userInfo.profile}
                formData={formData}
                post_id={this.props.params.id}
              />
            )}
          </div>
        )}
        {this.state.openQuestion && (
          <div style={{ width: '50%' }}>
            <StaticQuestionContainer
              quiz={post.quiz}
              userInfo={this.props.userInfo}
              closeQuestion={this.closeQuestion}
              question={post.stim}
            />
          </div>
        )}
      </div>
    );
  }
}
const mapStateToProps = (state,ownProps) => {
  const post = state.forum.posts.find(post => post.id + '' === ownProps.params.id);
  return {
    userInfo: state.userInfo,
    formData: state.form,
    post: post
  };
};
export default connect(mapStateToProps)(ForumQuestion);
