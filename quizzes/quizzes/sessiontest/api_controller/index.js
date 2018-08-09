const express = require('express');

module.exports = (rpc, conn) => {
	const router = new express.Router();

	const task_queue = 'sessiontest_quiz_taskworker'; // for stuff that'll need ML, etc.
	const db_read_queue = 'sessiontest_quiz_dbread'; // simple endpoints
	const db_write_queue = 'sessiontest_quiz_dbwrite'; // simple endpoints

	const stdPosts = [
		// currently in use
		{ path: '/createUser', method: 'generateUser', queue: db_write_queue },
		{ path: '/startExperiment', method: 'startExperiment', queue: task_queue },
		{ path: '/getStimuliForUser', method: 'getStimuliForUser', queue: db_read_queue },
		{ path: '/metaResponse', method: 'insertMetaResponse', queue: db_write_queue },
		{ path: '/stimulusResponse', method: 'insertStimulusResponse', queue: db_write_queue },
		{ path: '/endExperiment', method: 'endExperiment', queue: task_queue },
	];

	stdPosts.forEach(point =>
		router.post(point.path, (req, res, next) => {
			console.log(`${point.path} hit`);
			const rpcParams = {
				method: point.method,
				data: { body: req.body, sessionId: req.session.id }
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
