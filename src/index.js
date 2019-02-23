import commandLineArgs from 'command-line-args';
import init from './commands/init.js';

let remainingArgs;
const commandOps = [{ name: 'name', defaultOption: true }];
const mainCommand = commandLineArgs(commandOps, { stopAtFirstUnknown: true });
remainingArgs = mainCommand._unknown || [];

switch (mainCommand.name) {
	case 'init': {
		if (remainingArgs.length > 0)
			console.log('ignoring extra arguments');
		init();
		break;
	}
	default: {
		const usage = 'blah blah blah';
		console.error(usage);
	}
}
