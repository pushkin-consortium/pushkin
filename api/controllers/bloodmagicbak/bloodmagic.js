const express = require('express');
const path = require('path');
const fs = require('fs');
const basicAuth = require('basic-auth');

const getFileName = () => {
	const fullPath = __filename;
	const fileName = fullPath.replace(/^.*[\\\/]/, '');
	return fileName.replace('.js', '');
};

const fileName = getFileName();
const channelName = fileName + '_rpc_worker';
const taskQueueName = fileName + '_task_queue';

const checkUser = (username, password) => {
	const output = fs.readFileSync(path.resolve('./admin.txt'), 'utf-8');
	const outputArray = output.split('\n');
	const users = outputArray.map(currentEl => ({
		username: currentEl.split(':')[0],
		password: currentEl.split(':')[1]
	}));
	return users.some(
		admin => admin.username === username && admin.password === password
	);
};

module.exports = (rpc, conn, dbWrite) => {
	const fileName = getFileName();
	const router = new express.Router();

	router.get('/health', (req, res, next) => {
		const rpcInput = {
			method: 'health',
			params: []
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data);
			})
			.catch(err => {
				console.log(err);
				next();
			});
	});

	// need an endpoint that will return the number of reponses for a specific quiz
	// based on a quiz user_id
	router.get('/totalQuestions', (req, res, next) => {
		const rpcInput = {
			method: 'raw',
			params: [` SELECT COUNT(*) FROM "bloodmagic_stimuli" `]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data[0]);
			})
			.catch(next)
	});

	router.get('/test_endpoint', (req, res, next) => {
		const rpcInput = {
			method: 'getEntropyStimuli',
			params: {
				user_id: req.query.user_id
			}
		};

		return rpc(conn, taskQueueName, rpcInput)
			.then(data => {
				console.log("##############################")
				console.log(data);
				res.json(data);
			}).catch(err => {
				res.send(err);
			});
	});

	router.get('/questionsAnswered', (req, res, next) => {
		const user_id = req.query.user_id;
		const rpcInput = {
			method: 'raw',
			params: [` SELECT COUNT(*) FROM "bloodmagic_stimulusResponses" WHERE user_id = ${user_id} `]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data[0]);
			})
			.catch(next)
	});

	router.get('/questionsAnsweredSoFar', (req, res, next) => {
		//const user_id = req.query.user_id;
		const rpcInput = {
			method: 'raw',
			params: [` SELECT COUNT(*) FROM "bloodmagic_stimulusResponses"  `]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data[0]);
			})
			.catch(next)
	});


	router.get('/topTen', (req, res, next) => {
		//const user_id = req.query.user_id;
		const rpcInput = {
			method: 'raw',
			params: [ ` SELECT "bloodmagic_stimulusResponses".user_id, COUNT("bloodmagic_stimulusResponses".user_id) FROM "bloodmagic_stimulusResponses" GROUP BY "bloodmagic_stimulusResponses".user_id   ` ]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data);
			})
			.catch(next)
	});


	router.get('/random', (req, res, next) => {
		let rpcInput;
		if(req.query && req.query.user_id) {
			const { user_id } = req.query;
			// return a random stimulus from the db that this user hasn't answered
			rpcInput = {
				method: 'raw',
				params: [
					`SELECT "bloodmagic_stimuli".id,
									"bloodmagic_stimuli".stimulus,
									"bloodmagic_stimuli".options
					 FROM "bloodmagic_stimuli"
					 WHERE "bloodmagic_stimuli".stimulus NOT IN (
						 SELECT stimulus from "bloodmagic_stimulusResponses" WHERE user_id = ${user_id}
					 )
					 ORDER BY RANDOM()
					 LIMIT 1
					 `
				]
			}
		} else {
			// return a random stimulus
			rpcInput = {
				method: 'raw',
				params: [
					`SELECT * from "bloodmagic_stimuli"
					 ORDER BY RANDOM()
					 LIMIT 1`
				]
			}
		}
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data[0] || null)
			})
			.catch(next)
	})


	router.post('/createUser', (req, res, next) => {
		const rpcInput = {
			method: 'generateUser',
			params: [req.body.auth0_id, req.body.user_id]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data);
			})
			.catch(next);
	});


	router.get('/users/:auth_id', (req, res, next) => {
		const rpcInput = {
			method: 'raw',
			params: [
				`SELECT * FROM "bloodmagic_users" WHERE "auth0_id" = '${req.params.auth_id}' LIMIT 1`
			]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				return res.json(data[0]);
			})
			.catch(err => {
				return next(err)
			})
	});


	router.put('/users/:auth_id', (req, res, next) => {
		const rpcInput = {
			method: 'updateUser',
			params: [req.params.auth_id, req.body.user_id]
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data);
			})
			.catch(next);
	});


	router.post('/deleteUser', (req, res, next) => {
		const userInput = {
			method: 'deleteUser',
			params: [req.body.id]
		};
		const responseInput = {
			method: 'raw',
			params: [
				`DELETE FROM "bloodmagic_responses" WHERE "user_id" = ${req.body.id}`
			]
		};
		const stimulusResponseInput = {
			method: 'raw',
			params: [
				`DELETE FROM "bloodmagic_stimulusResponses" WHERE "user_id" = ${req
					.body.id}`
			]
		};
		return rpc(conn, channelName, responseInput)
			.then(data => {
				return rpc(conn, channelName, stimulusResponseInput).then(data => {
					return rpc(conn, channelName, userInput).then(data => {
						res.json(data);
					});
					res.json(data);
				});
				res.json(data);
			})
			.catch(next);
	});


	router.post('/questions', (req, res, next) => {
		const rpcInput = {
			method: 'getAllStimuli',
			params: []
		};
		return rpc(conn, channelName, rpcInput)
			.then(data => {
				res.json(data);
			})
			.catch(next);
	});


	// get all questions for a quiz
	router.post('/getAllStimuli', (req, res, next) => {
		const user = req.body.user;
		var rpcInput = {
			method: 'getAllStimuli',
			params: [user]
		};
		return rpc(conn, taskQueueName, rpcInput)
			.then(data => {
				res.json(data);
			})
			.catch(next);
		// create a channel
	});


	// save in db
	router.post('/stimulusResponse', (req, res, next) => {
		const user_id = req.body.user_id;
		const stimulus = req.body.stimulus;
		const data_string = req.body.data_string;
		const num_responses = parseInt(req.body.num_responses) + 1;
		const create = {
			method: 'createStimulusResponse',
			params: [
				{ user_id: user_id, stimulus: stimulus, data_string: data_string }
			]
		};
		const update = {
			method: 'raw',
			params: [
				`UPDATE "bloodmagic_stimuli" SET "num_responses" = "num_responses" + 1 WHERE "stimulus" = '${stimulus}'`
			]
		};
		return rpc(conn, channelName, create)
			.then(data => {
				return dbWrite(conn, fileName + '_db_write', update).then(() => {
					res.json(data);
				});
			})
			.catch(next);
	});


	// save in db
	router.post('/response', (req, res, next) => {
		const user_id = req.body.user_id;
		const data_string = req.body.data_string;
		const create = {
			method: 'createResponse',
			params: [{ user_id: user_id, data_string: data_string }]
		};
		return rpc(conn, channelName, create)
			.then(data => {
				res.json(data);
			})
			.catch(next);
	});


	// remove users with no responses after two hours - hit by cron job
	router.post('/clean', (req, res, next) => {
		const user = basicAuth(req);
		if (!user || !user.name || !user.pass) {
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			return res.sendStatus(401);
		}
		if (checkUser(user.name, user.pass)) {
			const clean = {
				method: 'raw',
				params: [
					`DELETE FROM "bloodmagic_users" WHERE "id" NOT IN (SELECT "user_id" FROM "bloodmagic_responses" UNION SELECT "user_id" FROM "bloodmagic_stimulusResponses") AND "created_at" < NOW() - INTERVAL '2 hours'`
				]
			};
			return dbWrite(conn, fileName + '_db_write', clean)
				.then(() => {
					res.sendStatus(200);
				})
				.catch(next);
		} else {
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			return res.sendStatus(401);
		}
	});


	return router;
};
