import fs from 'fs';
import path from 'path';

export default (experimentsDir, newExpName) => {
	const newDir = path.join(experimentsDir, newExpName);
	if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory())
		throw new Error(`A directory in the experiments folder already exists with this name (${newExpName})`);

	// 1. add targz from generateFiles/epxeriment\ template to build command
	// 2. extract files to the new location
	// 3. replace "template" with the quiz name
};
