import commandLineArgs from 'command-line-args';

const commandOps = [{ name: 'name', defaultOption: true }];
const mainCommand = commandLineArgs(commandOps, { stopAtFirstUnknown: true });
let restOfArgs = mainCommand._unknown || [];

switch (mainCommand) {
	case 'init':
		// do the init
		break;
	default:
		const usage = 'blah blah blah';
		console.error(usage);
}
