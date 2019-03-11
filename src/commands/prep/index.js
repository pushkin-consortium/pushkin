import path from 'path';
import { execSync } from 'child_process';

export default (experimentsDir, coreDir) => {
	// fall back to a bash script for now
	const prepScript = path.join(coreDir, '../.pushkin/bin/prep.sh');
	execSync(`bash ${prepScript} ${coreDir}`);
};
