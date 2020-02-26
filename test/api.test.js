const pushkin = require('../src/index.js');
const express = require('express');

describe('ControllerBuilder', () => {
	
	const myController = new pushkin.ControllerBuilder();
	const p = myController.passAlongs;
	const d = myController.directUses;
	const v = myController.validHttpMethods;

	const db_read_queue = 'myexp_quiz_dbread'; 
	const db_write_queue = 'myexp_quiz_dbwrite'; 
	const task_queue = 'myexp_quiz_taskworker';

	const count = 0;

	test('test controller init', () => {
		expect([p.length, d.length, v.length]).toStrictEqual([0, 0, 4]);
	});

	test('test setPass, one adding to passAlongs', () => {
		myController.setPass('/testRoute', 'testRPC', task_queue, 'post');
		expect(myController.passAlongs.length).toBe(1);
	});
	myController.passAlongs.pop();

	test('test setDirectUse, one adding to directUses', () => {
		// myController.setDirectUse('/testRoute2', 'hanlder', 'get');
		myController.setDirectUse('/router1', function(req, res) {
  			res.send('direct use 1st');
		}, 'get');
		myController.setDirectUse('/router2', function(req, res) {
  			res.send('direct use 2nd');
		}, 'get');
		expect(myController.directUses.length).toBe(2);
	});

	test('test setDefaultPasses, six addings to passAlongs', () => {
		myController.setDefaultPasses(db_read_queue, db_write_queue, task_queue);
		expect(myController.passAlongs.length).toBe(7);
	});

	const api = new pushkin.API(3000, 'amqp://localhost:5672');

	test('test useController', () => {
		const router = new express.Router();
		myController.directUses.forEach(point =>
			router[point.httpMethod](point.route, point.handler)
		);
		api.useController('/myexp', router);
	});

	test('test start', () => {
		api.initialized = true;
		api.start();
		console.log('ready to access the http://localhost:3000/myexp/router1 to see if any response');
	});

});
