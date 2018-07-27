const express = require('express');

module.exports = (rpc, conn) => {
	const router = new express.Router();

	const task_queue = 'miniexample_quiz_taskworker'; // for stuff that'll need ML, etc.
	const db_read_queue = 'miniexample_quiz_dbread'; // simple endpoints
	const db_write_queue = 'miniexample_quiz_dbwrite'; // simple endpoints

	// everything is just going to use POST as of 7/23/18's meeting
	const stdPosts = [
		{ path: '/response', method: 'insertResponse', queue: db_write_queue },
		{ path: '/createUserWithAuth', method: 'generateUserWithAuth', queue: db_write_queue },
		{ path: '/createUser', method: 'generateUser', queue: db_write_queue },
		{ path: '/users/:auth_id', method: 'updateUser', queue: db_write_queue },
		{ path: '/startExperiment', method: 'startExperiment', queue: task_queue },
		{ path: '/getAllStimuli', method: 'getAllStimuli', queue: db_read_queue },
		{ path: '/metaResponse', method: 'insertMetaResponse', queue: db_write_queue },
		{ path: '/stimulusResponse', method: 'insertStimulusResponse', queue: db_write_queue },
		{ path: '/nextStimulus', method: 'nextStimulus', queue: task_queue },
		{ path: '/feedback', method: 'getFeedback', queue: task_queue },
		{ path: '/activateStimuli', method: 'activateStimuli', queue: task_queue }
	];

	stdPosts.forEach(point =>
		router.post(point.path, (req, res, next) => {
			console.log(`${point.path} hit`);
			const rpcParams = {
				method: point.method,
				data: req.body
			};
			rpc(conn, point.queue, rpcParams)
				.then(rpcRes => {
					console.log(`${point.path} response: ${rpcRes}`);
					res.send({ resData: rpcRes });
				})
				.catch(rpcErr => {
					console.log('Error in API getting RPC response:');
					console.log(rpcErr);
					res.status(500).send(rpcError);
				});
		})
	);

	return router;
};
