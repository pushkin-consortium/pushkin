const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');

const quizName = process.argv[2];
const quizSeeder = require(`${__dirname}/seeds/${quizName}/index`);

inquirer.prompt([{
	type: 'confirm',
	name: 'inDocker',
	message: 'Are you in pushkin-db docker?'
}])
	.then(answer => {
		if (!answer.inDocker)
			throw new Error('You must be in a docker container with the database URLs as environment variables to seed.');

		return inquirer.prompt([{
			type: 'confirm',
			name: 'ranMigration',
			message: 'Have you ran your migrations?'
		}])
	})
	.then(answer => {
		if (!answer.ranMigration)
			throw new Error('The database can\'t be seeded until the migrations have been run.');

		return inquirer.prompt([{
			type: 'confirm',
			name: 'madeSeeds',
			message: 'Do you have the seeds filled out as you would like them to be in the database?'
		}])
	})
	.then(answer => {
		if (!answer.madeSeeds)
			throw new Error('Fill out the seeds in your quiz folder, run \'pushkin prep\', and try again from a rebuilt container.');

		// all good
		quizSeeder();
	})
	.catch(err => {
		console.log(chalk.red(err));
	});
