import React from 'react';
import ForumContent from '../components/Forum/ForumContent';
import { connect } from 'react-redux';
import { fetchAllPosts, makePost, search, clearSearch } from '../actions/forum';
import ForumTrendingQuestions from '../components/Forum/ForumTrendingQuestions';
// import QuizForum from '../../components/QuizForum/index';
import { Row, Col, Form, FormControl, Button } from 'react-bootstrap'; // Bootstrap dropped Glyphicon support
// import { isAuthenticated, login, checkLogin, getUserInfo } from '../actions/userInfo';
// import SearchResultList from '../../components/SearchResultList';
// import { Link } from 'react-router';

class Forum extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isModalOpen: false, posts: null };
  }
  // componentDidMount() {
  //   this.props.dispatch(fetchAllPosts());
  //   this.props.dispatch(getUserInfo());
  // }
  makeForumPost = (post, cb) => {
    this.props.dispatch(makePost(post, cb));
  };
  // dispatchCheckLogin = () => {
  //   this.props.dispatch(checkLogin());
  // };
  handleLocalPostChange = () => {
    this.props.dispatch(fetchAllPosts()).then(res => {
      this.setState({ posts: res });
    });
  };
  executeSearch(q) {
    this.props.dispatch(search(q));
  }
  handleSubmit = e => {
    e.preventDefault();
    const q = this.refs.search.value;
    this.refs.search.value = '';
    if (q.length > 0) {
      this.executeSearch(q);
    }
  };
  showResults = () => {
    const { term, results } = this.props;
    const dispatchClearSearch = _ => this.props.dispatch(clearSearch());
    return (
      <div>
        {/* <SearchResultList
          results={results}
          term={term}
          clearSearch={dispatchClearSearch}
        /> */}
      </div>
    );
  };
  showPosts = () => {
    const { forum, userInfo, formData, posts, results } = this.props;
    return (
      <div>
        {/* <QuizForum
          user={userInfo}
          fromForum
          isAuthenticated={isAuthenticated}
          makeForumPost={this.makeForumPost}
          formData={formData}
          checkLogin={this.dispatchCheckLogin}
          login={login}
          handleLocalPostChange={this.handleLocalPostChange}
        /> */}
        <ForumContent posts={posts} />
      </div>
    );
  };
  render() {
    const { forum, userInfo, formData, posts, results } = this.props;
    return (
      <div className="m-5">
        {this.props.children && <div>{this.props.children}</div>}
        {!this.props.children && (
          <div md={12}>
            <div>
              <div>
                <ForumTrendingQuestions />
              </div>
            </div>
            <Form onSubmit={this.handleSubmit}>
              <Form.Row className="justify-content-center">
                <Col xs={11}>
                  <FormControl
                    ref="search"
                    type="text"
                    placeholder="Search Forum"
                  />
                </Col>
                <Col xs={1}>
                  <Button onClick={this.handleSubmit} variant="outline-info">
                    Search
                  </Button>
                </Col>
              </Form.Row>
              {/* <a href="#" onClick={this.handleSubmit}>
                <img style={styles.searchIcon} src="http://www.endlessicons.com/wp-content/uploads/2012/12/search-icon.png" />
              </a> */}
            </Form>
            <div>
              {posts && !results && this.showPosts()}
              {results && this.showResults()}
            </div>
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    posts: state.forum.posts,
    userInfo: state.userInfo.profile,
    formData: state.form,
    results: state.forum.results,
    term: state.forum.term
  };
};
export default connect(mapStateToProps)(Forum);
