import commandLineArgs from 'command-line-args';
import init from './commands/init.js';
import template from './commands/template.js';

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

switch (nextArg()) {
	case 'init': {
		init();
		break;
	}
	case 'generate': {
		switch (nextArg()) {
			case 'template': {
				template();
				break;
			}
		}
	}
	default: {
		const usage = 'blah blah blah';
		console.error(usage);
	}
}
