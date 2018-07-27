const express = require('express');

module.exports = (rpc, conn) => {
	const router = new express.Router();

	const task_queue = 'miniexample_quiz_taskworker'; // for stuff that'll need ML, etc.
	const db_read_queue = 'miniexample_quiz_dbread'; // simple endpoints
	const db_write_queue = 'miniexample_quiz_dbwrite'; // simple endpoints

	// everything is just going to use POST as of 7/23/18's meeting
	const stdPosts = [
		{ path: '/response', method: 'insertResponse', queue: db_write_queue },

		{ path: '/createUserWithAuth', method: 'generateUserWithAuth', queue: db_write_queue,
			data: req => ({ auth_id: req.query.auth_id }) },

		{ path: '/createUser', method: 'generateUser', queue: db_write_queue, data: req => '' },

		{ path: '/users/:auth_id', method: 'updateUser', queue: db_write_queue,
			data: req => ({ user_id: req.body.user_id, auth_id: req.params.auth_id }) },

		{ path: '/startExperiment', method: 'startExperiment', queue: task_queue, data: req => '' },

		{ path: '/getAllStimuli', method: 'getAllStimuli', queue: db_read_queue,
			data: req => ({ user_id: req.body.user_id }) },

		{ path: '/metaResponse', method: 'insertMetaResponse', queue: db_write_queue, 
			data: req => ({ user_id: req.body.user_id, data: req.body.data }) },

		{ path: '/stimulusResponse', method: 'insertStimulusResponse', queue: db_write_queue,
			data: req => ({ user_id: req.body.user_id, data_string: req.body.data_string }) },

		{ path: '/nextStimulus', method: 'nextStimulus', queue: task_queue,
			data: req => ({ user_id: req.body.user_id }) },

		{ path: '/feedback', method: 'getFeedback', 
			data: req => ({ user_id: req.query.user_id }), queue: task_queue },

		{ path: '/activateStimuli', method: 'activateStimuli', queue: task_queue, data: req => '' }
	];

	stdPosts.forEach(point =>
		router.post(point.path, async (req, res, next) => {
			const rpcParams = {
				method: point.method,
				data: req.body
			};
			try {
				const rpcRes = await rpc(conn, point.queue, rpcParams);
			} catch (e) {
				console.log('Error in API getting RPC response');
				console.log(e);
			}
		})
	);

	return router;
};
