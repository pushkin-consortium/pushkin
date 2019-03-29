import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';

export default expDir => {
	const expConfigPath = path.join(expDir, 'config.yaml');
	let expConfig;
	try { expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); }
	catch (e) { return fail(`Failed to load config file for ${expDir}`, e); }

};
