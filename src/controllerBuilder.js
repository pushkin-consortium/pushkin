import express from 'express';
import rpc from './rpc.js';
import trim from './trim.js';

export default class ControllerBuilder {
	constructor() {
		this.passAlongs = [];
		this.directUses = [];
		this.validHttpMethods = ['get', 'post', 'put', 'delete'];
	}

	// pass posts/gets/puts/deletes on this route to this method via this queue
	setPass(route, rpcMethod, queue, httpMethod) {
		httpMethod = httpMethod || 'post';
		if (this.validHttpMethods.indexOf(httpMethod) < 0) {
			console.error(`'${httpMethod}' is not a valid http method. Ignoring for route ${route}`);
			return;
		}
		this.passAlongs.push({ route, rpcMethod, queue, httpMethod });
	}

	// allow users to set their own custom api endpoints that just pass things along
	setCustomPass(route, handler, queue, httpMethod) {
		httpMethod = httpMethod || 'post';
		if (this.validHttpMethods.indexOf(httpMethod) < 0) {
			console.error(`'${httpMethod}' is not a valid http method. Ignoring for route ${route}`);
			return;
		}
		this.passAlongs.push({ route, rpcMethod, queue, httpMethod });
	}

	// allow users to set their own custom api endpoints that don't just pass things along
	setDirectUse(route, handler, httpMethodOption) {
		const httpMethod = httpMethodOption == undefined ? 'post' : httpMethodOption;
		this.directUses.push({ httpMethod, route, handler });
	}

	setDefaultPasses(readQueue, writeQueue, taskQueue) {
		this.setPass('/startExperiment', 'startExperiment', taskQueue, 'post');
		this.setPass('/getStimuli', 'getStimuli', readQueue, 'post');
		this.setPass('/metaResponse', 'insertMetaResponse', writeQueue, 'post');
		this.setPass('/stimulusResponse', 'insertStimulusResponse', writeQueue, 'post');
		this.setPass('/endExperiment', 'endExperiment', taskQueue, 'post');
	}

	getConnFunction() {
		return conn => {
			const router = new express.Router();

			this.passAlongs.forEach(point => 
				router[point.httpMethod](point.route, (req, res, next) => { // eslint-disable-line

					console.log(`${point.httpMethod.toUpperCase()} ${point.route} hit (in router conn function)`);
					console.log(req.body);

					const rpcParams = {
						method: point.rpcMethod,
						data: req.body,
						params: req.params,
						sessionId: req.session.id
					};

					rpc(conn, point.queue, rpcParams)
						.then(rpcRes => {
							try { console.log(`${point.rpcMethod} method rpc response: ${trim(JSON.stringify(rpcRes), 100)}`); }
							catch (e) { console.log(`${point.rpcMethod} method rpc response (failed to JSON.stringify): ${trim(rpcRes, 100)}`); }
							res.send({ resData: rpcRes });
						})
						.catch(rpcErr => {
							console.error(`Error in API getting RPC response: ${rpcErr}`);
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
