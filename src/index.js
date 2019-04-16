#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
// subcommands
import generate from './commands/generate/index.js';
import init from './commands/init/index.js';
import prep from './commands/prep/index.js';
import setupdb from './commands/setupdb/index.js';

const moveToProjectRoot = () => {
	// better checking to make sure this is indeed a pushkin project would be good
	while (process.cwd() != path.parse(process.cwd()).root) {
		if (fs.existsSync(path.join(process.cwd(), 'pushkin.yaml'))) return;
		process.chdir('..');
	}
	throw new Error('No pushkin project found here or in any above directories');
};
const loadConfig = () => {
	// could add some validation to make sure everything expected in the config is there
	try { return jsYaml.safeLoad(fs.readFileSync('pushkin.yaml', 'utf8')); }
	catch (e) { console.error(`Pushkin config file missing, error: ${e}`); process.exit(); }
};

// ----------- process command line arguments ------------
const inputGetter = () => {
	let remainingArgs = process.argv;
	return () => {
		const commandOps = [{ name: 'name', defaultOption: true }];
		const mainCommand = commandLineArgs(
			commandOps,
			{ argv: remainingArgs, stopAtFirstUnknown: true }
		);
		remainingArgs = mainCommand._unknown || [];
		return mainCommand.name;
	};
};
const nextArg = inputGetter();

(() => {
	switch (nextArg()) {
		case 'init': {
			init(process.cwd());
			return;
		}
		case 'generate': {
			moveToProjectRoot();
			const config = loadConfig();
			const name = nextArg();
			generate(path.join(process.cwd(), config.experimentsDir), name);
			return;
		}
		case 'prep': {
			moveToProjectRoot();
			const config = loadConfig();
			prep(
				path.join(process.cwd(), config.experimentsDir),
				path.join(process.cwd(), config.coreDir),
				err => {
					if (err) console.error(`Error prepping: ${err}`);
				}
			);
			return;
		}
		case 'setupdb': {
			moveToProjectRoot();
			const config = loadConfig();
			setupdb(config.databases, path.join(process.cwd(), config.experimentsDir));
			return;
		}
		case 'hardreset': {
			exec('docker-compose down; docker rm -f $(docker ps -a -q); docker volume rm $(docker volume ls -q);', (err, stdout, stderr) => {
			  if (err) {
    			console.log(`Error resetting docker containers and volumes: ${err}`);
			    return;
			  }
			})
		}
		default: {
			const usage = 'blah blah blah usage';
			console.error(usage);
			return;
		}
	}
})();
