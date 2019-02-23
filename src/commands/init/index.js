import fs from 'fs';
import path from 'path';
import makeTemplate from './makeTemplate.js';

export default (withTemplate) => {
	const cwd = process.cwd();
	const pushLocation = path.join(cwd, '.pushkin');
	if (fs.existsSync(pushLocation) && fs.lstatSync(pushLocation).isDirectory()) {
		console.error('A .pushkin folder was already found in this directory. Aborting.');
		return;
	}

	fs.mkdirSync('.pushkin');

	if (withTemplate) makeTemplate();
};
