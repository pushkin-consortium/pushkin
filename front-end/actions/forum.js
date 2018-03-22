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
export function getUserPostIds(auth0Id) {
  return new Promise((resolve, reject) => {
    return local
      .get(`/user/${auth0Id}/posts`)
      .then(res => {
        resolve(res.data);
      })
      .catch(err => {
        throw err;
      });
  });
}
export function getOnePost(id) {
  fetchAllPostsBegin();
  return new Promise((resolve, reject) => {
    return local
      .get(`/posts/${id}`)
      .then(res => {
        return res.data;
      })
      .then(data => {
        return local
          .get(`/getAuth0User/${data.auth0_id}`)
          .then(user => {
            return {
              ...data,
              ...user.data
            };
          })
          .then(data => {
            if (data.forumComments.length) {
              return Promise.all(
                data.forumComments.map(comment => {
                  return local
                    .get(`/getAuth0User/${comment.auth0_id}`)
                    .then(user => {
                      return {
                        ...comment,
                        ...user.data
                      };
                    });
                })
              ).then(comments => {
                resolve({
                  ...data,
                  forumComments: comments
                });
              });
            } else {
              resolve(data);
            }
          });
      });
  }).catch(err => {
    throw err;
  });
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
        return local.get(`/getAuth0User/${resp.data.auth0_id}`).then(user => {
          cb({
            ...resp.data,
            ...user.data
          });
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
  return (dispatch, getState) => {
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
