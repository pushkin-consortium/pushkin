const express = require('express');
//const path = require('path');
//const fs = require('fs');
//const RPCParams = require('./RPCParams');

module.exports = (rpc, conn, dbWrite) => { // don't use dbWrite (deprecated)
	const router = new express.Router();

	router.get('/test', (req, res, next) => {
		const sql = `SELECT 
						COUNT(*) as num_responses,  
						"bloodmagic_stimulusResponses".data_string->>'responses' as response, 
						"bloodmagic_stimulusResponses".stimulus
				FROM bloodmagic_stimuli
				LEFT JOIN "bloodmagic_stimulusResponses"
				ON "bloodmagic_stimulusResponses".stimulus = "bloodmagic_stimuli".stimulus
				WHERE "bloodmagic_stimuli".stimulus NOT IN (
						SELECT stimulus from "bloodmagic_stimulusResponses" WHERE user_id = {}
				) AND question_category='{}'
				GROUP BY 
						"bloodmagic_stimulusResponses".data_string->>'responses', 
						"bloodmagic_stimulusResponses".stimulus`;
		return rpc(conn, 'db_logger_queue', sql)
			.then(data =>{
				console.log(`CONTROLLER RESULTS: ${data}`);
				res.send(data);
			})
			.catch(err => {
				console.log(err);
				res.send('error');
			});
	});

	return router;
};
