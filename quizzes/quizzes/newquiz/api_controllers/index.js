const express = require('express');
const path = require('path');
const fs = require('fs');
const RPCParams = require('./RPCParams');

module.exports = (rpc, conn, dbWrite) => { // don't use dbWrite (deprecated)
	const router = new express.Router();

	// standard get endpoints mapped out
	const stdGets = [
		{ path: '/health', method: 'health', data: req => ''},
		{ path: '/totalQuestions', method: 'totalQuestions', data: req => ''},
		{ path: '/questionsAnswered', method: 'questionsAnswered',
			data: req => ({ user_id: req.query.user_id })},
		{ path: '/totalQuestionsAnswered', method: 'totalQuestionsAnswered', data: req => ''},
		{ path: '/topTen', method: 'topTen', data: req => ''},
		{ path: '/randomFromUser', method: 'random', data: req => ({ user_id: req.query.user_id })},
		{ path: '/random', method: 'random', data: req => ''},
		{ path: '/questions', method: 'getAllStimuli', data: req => ''}
	];

	const stdPosts = [
		{ path: '/deleteUser', method: 'deleteUser', data: req => ({ user_id: req.body.user_id })},
		{ path: '/stimulusResponse', method: 'createStimulusResponse',
			data: req => ({
				user_id: req.body.user_id,
				stimulus: req.body.stimulus,
				data_string: req.body.data_string,
				// this should be handled by the backend quiz worker,
				// not trusted by the post request
				num_responses: parseInt(req.body.num_responses) + 1
			}) },
		{ path: '/response', method: 'createResponse',
			data: req => { user_id: req.body.user_id, data_string: req.body.data_string } }
	];

	const stdPuts = [
		{ path: '/users/:auth_id', method: 'updateUser',
			data: req => { user_id: req.body.user_id, auth_id: req.params.auth_id } }
	];

	stdGets.forEach(point =>
		router.get(point.path, (req, res, next) => {
			const params = new RPCParams(point.method, point.data(req));
			return rpc(conn, 'newquiz_api_queue', params.getParams())
				.then(data => res.send(data))
				.catch(err => res.send(err));
		})
	);

	stdPosts.forEach(point =>
		router.post(point.path, (req, res, next) => {
			const params = new RPCParams(point.method, point.data(req));
			return rpc(conn, 'newquiz_api_queue', params.getParams())
				.then(data => res.send(data))
				.catch(err => res.send(err));
		})
	);

	stdPuts.forEach(point =>
		router.put(point.path, (req, res, next) => {
			const params = new RPCParams(point.method, point.data(req));
			return rpc(conn, 'newquiz_api_queue', params.getParams())
				.then(data => res.send(data))
				.catch(err => res.send(err));
		})
	);

	return router;
};
