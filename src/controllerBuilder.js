import express from 'express';
import rpc from './rpc.js';
import trim from './trim.js';

export default class ControllerBuilder {
	constructor() {
		this.passAlongs = [];
		this.directUses = [];
	}

	// pass posts on this route to this method via this queue
	setPass(route, method, queue) {
		this.passAlongs.push({ route, method, queue });
	}

	// allow users to set their own custom api endpoints that don't just pass things along
	setDirectUse(route, handler, httpMethodOption) {
		const httpMethod = httpMethodOption == undefined ? 'post' : httpMethodOption;
		this.directUses.push({ httpMethod, route, handler });
	}

	setDefaultPasses(readQueue, writeQueue, taskQueue) {
		this.setPass('/startExperiment', 'startExperiment', taskQueue);
		this.setPass('/getStimuli', 'getStimuli', readQueue);
		this.setPass('/metaResponse', 'insertMetaResponse', writeQueue);
		this.setPass('/stimulusResponse', 'insertStimulusResponse', writeQueue);
		this.setPass('/endExperiment', 'endExperiment', taskQueue);
	}

	getConnFunction() {
		return conn => {
			const router = new express.Router();

			this.passAlongs.forEach(point => 
				router.post(point.route, (req, res, next) => { // eslint-disable-line

					console.log(`${point.route} hit (in router conn function)`);
					console.log(req.body);

					const rpcParams = {
						method: point.method,
						data: req.body,
						sessionId: req.session.id
					};

					rpc(conn, point.queue, rpcParams)
						.then(rpcRes => {
							try { console.log(`${point.method} method rpc response: ${trim(JSON.stringify(rpcRes), 100)}`); }
							catch (e) { console.log(`${point.method} method rpc response (failed to JSON.stringify): ${trim(rpcRes, 100)}`); }
							res.send({ resData: rpcRes });
						})
						.catch(rpcErr => {
							console.log('Error in API getting RPC response:');
							console.log(rpcErr);
							res.status(500).send(rpcErr);
						});
				})
			);

			this.directUses.forEach(point =>
				router[point.httpMethod](point.route, point.handler)
			);

			return router;
		};
	}
}
