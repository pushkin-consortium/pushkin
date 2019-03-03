import local from './localAxios';
import { error } from './error';
export const FETCH_ALL_POSTS = 'FETCH_ALL_POSTS';
export const CREATE_POST = 'CREATE_POST';
export const FETCHING = 'FETCHING';
export const FETCH_ONE_POST = 'FETCH_ONE_POST';
export const SEARCH_RESULTS = 'SEARCH_RESULTS';
export const SEARCH_TERM = 'SEARCH_TERM';
export const CLEAR_SEARCH = 'CLEAR_SEARCH';
export const RECEIVE_COMMENTS = 'RECEIVE_COMMENTS';
export const REMOVE_POST = 'REMOVE_POST';
export const REMOVE_COMMENT = 'REMOVE_COMMENT'
// both take ids;

function sendAllPosts(data) {
  return {
    type: FETCH_ALL_POSTS,
    data
  };
}
function sendOnePost(post) {
  return {
    type: FETCH_ONE_POST,
    post
  };
}
function createPost(post) {
  return {
    type: CREATE_POST,
    post
  };
}
function fetchAllPostsBegin() {
  return {
    type: FETCHING
  };
}
export function fetchAllPosts() {
  return dispatch => {
    dispatch(fetchAllPostsBegin());
    return local
      .get('/posts')
      .then(res => {
        return res.data;
      })
      .then(posts => {
        return dispatch(sendAllPosts(posts));
      })
      .catch(err => {
        throw err;
      });
  };
}
function fetchingUserPosts() {
  return {
    type: 'FETCHING_USER_POSTS'
  }
}
function userPosts(posts) {
  return {
    type: 'RECEIVED_USER_POSTS',
    posts
  }
}
export function getUserPostIds(auth0Id) {
  return dispatch => {
    dispatch(fetchingUserPosts());
    return local
      .get(`/user/${auth0Id}/posts`)
      .then(res => {
        return res.data.map(post => {
          dispatch(updatePost(post))
        })
      })
      .catch(err => {
        dispatch(error(err));
      });
  }
  return new Promise((resolve, reject) => {
  });
}
function updatePost(post) {
  return {
    type: 'UPDATE_POST',
    post
  };
}
export function getOnePost(id) {
  return dispatch => {
    dispatch(fetchAllPostsBegin());
      return local
        .get(`/posts/${id}`)
        .then(res => {
          return res.data;
        })
        .then(data => {
          return local
            .get(`/getAuth0User/${data.auth0_id}`)
            .then(res => {
              let user = res.data;
              return {
                ...data,
                ...user
              };
            })
            .then(data => {
              if (data.forumComments.length) {
                return Promise.all(
                  data.forumComments.map(comment => {
                    return local
                      .get(`/getAuth0User/${comment.auth0_id}`)
                      .then(res => {
                        let user = res.data;
                        return {
                          ...comment,
                          ...user
                        };
                      });
                  })
                ).then(comments => {
                  return ({
                    ...data,
                    forumComments: comments
                  });
                });
              }
              return data;
            })
        }).then(post => {
          dispatch(updatePost(post));
        })
  }
}
export function makeComment(payload, cb) {
  return (dispatch, getState) => {
    local
      .post(`/posts/${payload.post_id}/comments`, payload, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('id_token')
        }
      })
      .then(resp => {
        // build the new post
        const state = getState()
        const post = state.forum.posts.find(post => post.id + '' === resp.data.post_id)
        post.forumComments = post.forumComments || [];
        return local.get(`/getAuth0User/${resp.data.auth0_id}`).then(user => {
          post.forumComments.push({ ...resp.data, ...user.data })
          return dispatch(updatePost(post));
        });
      })
      .then(res => {
        swal({
          title: 'Comment posted',
          type: 'success',
          text: 'You could track this post on the dashboard'
        });
      })
      .catch(err => {
        return dispatch(error(err));
      });
  };
}
export function makePost(payload, cb) {
  return dispatch => {
    local
      .post('/posts', payload, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('id_token')
        }
      })
      .then(res => {
        return dispatch(createPost(res.data));
      })
      .then(() => {
        swal({
          title: 'Post created',
          type: 'success',
          text: 'You could track your post on the dashboard',
          onClose: cb()
        });
      })
      .catch(err => {
        console.log('made it here', err);
        return dispatch(error(err));
      });
  };
}

const searchResults = results => {
  return {
    type: SEARCH_RESULTS,
    results
  };
};
const searchTerm = term => {
  return {
    type: SEARCH_TERM,
    term
  };
};

export function search(term) {
  return dispatch => {
    dispatch(searchTerm(term));
    return local
      .get(`/posts?q=${term}`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('id_token')
        }
      })
      .then(resp => dispatch(searchResults(resp.data)))
      .catch(err => dispatch(error(err)));
  };
}
export function clearSearch() {
  return {
    type: CLEAR_SEARCH
  };
}


function removePost(id) {
  return {
    type: REMOVE_POST, 
    id
  }
}
export function deletePost(post) {
  return dispatch => {
    if(getState().userInfo.isAdmin) {
    return local
      .delete(`/posts/${post.id}`, {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('id_token')
        }
      })
      .then(resp => {
        dispatch(removePost(post.id))
      })
    } else {
      return Promise.resolve()
    }
  };
}
function receiveComments(comments) {
  return {
    type: RECEIVE_COMMENTS,
    comments
  };
}

export function getComments() {
  return dispatch => {
    dispatch(fetchAllPostsBegin());
    return local
      .get('/comments', {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('id_token')
        }
      })
      .then(resp => {
        dispatch(receiveComments(resp.data));
      });
  };
}

function removeComment(id) {
  return {
    type: REMOVE_COMMENT,
    id
  }
}
export function deleteComment(comment) {
  return (dispatch, getState) => {
    if(getState().userInfo.isAdmin) {
      return local
        .delete(`/posts/${comment.post_id}/comments/${comment.id}`, {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('id_token')
          }
        })
        .then(resp => {
          dispatch(removeComment(comment.id))
        })
    } else {
      return Promise.resolve()
    }

  };
}
