const express = require('express');
const path = require('path');
const fs = require('fs');
const RPCParams = require('./RPCParams');

module.exports = (rpc, conn, dbWrite) => { // don't use dbWrite (deprecated)
	const router = new express.Router();

	const task_queue = 'test_quiz_taskworker'; // for stuff that'll need ML, etc.
	const db_read_queue = 'test_quiz_dbread'; // simple endpoints
	const db_write_queue = 'test_quiz_dbwrite'; // simple endpoints

	const stdGets = [
		// user-specific endpoints
		{ path: '/nextQuestion', method: 'nextQuestion', // get the next question for user in this quiz
			data: req => ({user_id: req.query.user_id}), queue: db_read_queue },
		{ path: '/questionsAnswered', method: 'questionsAnswered', // questions answered by this user so far
			data: req => ({ user_id: req.query.user_id }), queue: db_read_queue },
		{ path: '/feedback', method: 'getFeedback', // called when quiz has ended, make a prediction based on user responses
			data: req => ({ user_id: req.query.user_id }), queue: task_queue },

		// general quiz endpoints
		{ path: '/health', method: 'health', data: req => '', queue: db_read_queue }, // test if server is responsive
		{ path: '/random', method: 'random', data: req => '', queue: db_read_queue }, // get a random question
		{ path: '/questions', method: 'getAllQuestions', data: req => '', queue: db_read_queue }, // get all questions in this quiz
		{ path: '/totalQuestions', method: 'totalQuestions', data: req => '', queue: db_read_queue } // total questions answered by all users
	];

	const stdPosts = [
		{ path: '/respond', method: 'createResponse', queue: db_write_queue, // create a response for this user in the database
			data: req => ({ user_id: req.body.user_id, data_string: req.body.data_string }) }
	];

	const stdPuts = [];

	stdGets.forEach(point =>
		router.get(point.path, (req, res, next) => {
			const params = new RPCParams(point.method, point.data(req));
			console.log(`API SENT RPC ON QUEUE ${point.queue}`);
			return rpc(conn, point.queue, params.getParams())
				.then(data => res.send(data))
				.catch(err => res.send(err));
		})
	);

	stdPosts.forEach(point =>
		router.post(point.path, (req, res, next) => {
			const params = new RPCParams(point.method, point.data(req));
			return rpc(conn, point.queue, params.getParams())
				.then(data => res.send(data))
				.catch(err => res.send(err));
		})
	);

	stdPuts.forEach(point =>
		router.put(point.path, (req, res, next) => {
			const params = new RPCParams(point.method, point.data(req));
			return rpc(conn, point.queue, params.getParams())
				.then(data => res.send(data))
				.catch(err => res.send(err));
		})
	);

	return router;
};
