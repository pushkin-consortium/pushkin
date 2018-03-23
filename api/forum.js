const express = require('express');
const channelName = 'forum_rpc_worker';
const CONFIG = require('./config.js');
const _ = require('lodash')

function rpcFactory(method, params) {
  return {
    method,
    params
  }
}

module.exports = (rpc, conn, dbwrite) => {
  const router = new express.Router();
  router.get('/posts', (req, res, next) => {
    if (req.query.q) {
      var rpcInput = {
        method: 'searchPosts',
        params: [req.query.q]
      };
      return rpc(conn, channelName, rpcInput)
        .then(data => {
          res.json(data);
        })
        .catch(next);
    } else {
      var rpcInput = {
        method: 'allForumPosts',
        params: []
      };
      return rpc(conn, channelName, rpcInput)
        .then(data => {
          res.json(data);
        })
        .catch(next);
    }
  });
  router.get('/user/:auth0Id/posts', (req, res, next) => {
    var postRpcInput = {
      method: 'queryForumPost',
      params: [[['where', 'auth0_id', '=', req.params.auth0Id]]]
    };
    var commentRpcInput = {
      method: 'queryForumComment',
      params: [[['where', 'auth0_id', '=', req.params.auth0Id]]]
    };
    return rpc(conn, channelName, postRpcInput)
      .then(posts => {
        return rpc(conn, channelName, commentRpcInput).then(comments => {
          return {
            posts,
            comments
          };
        })
      }).then(({ posts, comments }) => {
        const postIds = posts.map(post => {
          return post.id;
        });
        const commentPostIds = comments
          .map(comment => {
            return comment.post_id;
          })
          .filter(Boolean);
        const combine = [...postIds, ...commentPostIds]
          .filter((id, index, self) => {
            return index === self.indexOf(id);
          })
          .sort();
        const combineRpcInput = {
          method: 'queryForumPost',
          params: [[['where', 'id', 'in', combine]]]
        };
        return rpc(conn, channelName, postRpcInput)
      }).then(data => {
        res.json(data);
      })
      .catch(next);
  });
  router.get('/posts/:id', (req, res, next) => {
    var rpcInput = {
      method: 'findForumPost',
      params: [req.params.id, ['forumComments']]
    };
    return rpc(conn, channelName, rpcInput)
      .then(data => {
        res.json(data);
      })
      .catch(next);
  });
  if (CONFIG.auth) {
    const checkJWT = require('./authMiddleware').verify;
    router.post('/posts', checkJWT, (req, res, next) => {
      const rpcInput = rpcFactory('createForumPost', [
        _.pick(req.body, [
          'auth0_id',
          'post_content',
          'stim',
          'quiz',
          'post_subject',
          'submitURL'
        ])
      ])
      return rpc(conn, channelName, rpcInput)
        .then(data => {
          res.json(data);
        })
        .catch(next);
    });
    router.post('/posts/:postId/comments', checkJWT, (req, res, next) => {
      var rpcInput = {
        method: 'createForumComment',
        params: [
          {
            auth0_id: req.body.auth0_id,
            responses: req.body.responses,
            post_id: req.params.postId
          }
        ]
      };
      return rpc(conn, channelName, rpcInput)
        .then(data => {
          res.json(data);
        })
        .catch(next)
    });
    router.get('/comments', checkJWT, (req, res, next) => {
      const rpcInput = rpcFactory('allForumComments', [])
      return rpc(conn, channelName, rpcInput)
        .then(data => res.json(data))
        .catch(next)

    });
    router.delete('/posts/:id', checkJWT, (req, res, next) => {
      const rpcInput = rpcFactory('deleteForumPost', [req.params.id])
      return rpc(conn, channelName, rpcInput)
        .then(data => res.json(data))
        .catch(next)
    })
    router.delete('/posts/:post_id/comments/:id', checkJWT, (req, res, next) => {
      const rpcInput = rpcFactory('deleteForumComment', [req.params.id])
      return rpc(conn, channelName, rpcInput)
        .then(data => res.json(data))
        .catch(next)
    })
  }
  return router;
};

