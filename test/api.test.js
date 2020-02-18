const pushkin = require('../src/index.js');

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

	// test('test setCustomPass, one adding to passAlongs', () => {
	// 	myController.setCustomPass('/testRoute', 'testRPC', task_queue, 'post');
	// 	expect(myController.passAlongs.length).toBe(2);
	// });
	// myController.passAlongs.pop();

	test('test setDirectUse, one adding to directUses', () => {
		myController.setDirectUse('/testRoute2', 'hanlder', 'get');
		expect(myController.directUses.length).toBe(1);
	});

	test('test setDefaultPasses, six addings to passAlongs', () => {
		myController.setDefaultPasses(db_read_queue, db_write_queue, task_queue);
		expect(myController.passAlongs.length).toBe(7);
	});

});
