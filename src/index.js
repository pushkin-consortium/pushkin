import commandLineArgs from 'command-line-args';
import jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
// subcommands
import generate from './commands/generate/index.js';
import init from './commands/init/index.js';
import prep from './commands/prep/index.js';

const moveToProjectRoot = () => {
	// better checking to make sure this is indeed a pushkin project would be good
	while (process.cwd() != path.parse(process.cwd()).root) {
		if (fs.existsSync(path.join(process.cwd(), '.pushkin/'))) return;
		process.chdir('..');
	}
	throw new Error('No pushkin project found here or in any above directories');
};
const loadConfig = () => {
	// could add some validation to make sure everything expected in the config is there
	try { return jsYaml.safeLoad(fs.readFileSync('.pushkin/config.yaml', 'utf8')); }
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
		}
		case 'prep': {
			moveToProjectRoot();
			const config = loadConfig();
			prep(path.join(process.cwd(), config.experimentsDir), path.join(process.cwd(), config.coreDir));
		}
		default: {
			const usage = 'blah blah blah';
			console.error(usage);
		}
	}
})();
