import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import { execSync, exec } from 'child_process';

const unzipAndUntar = file => {
	const inStream = fs.createReadStream(file);
};

export default (experimentsDir, coreDir, callback) => {
	const processes = [];
	const finishIfPossible = () => {
		processes.pop();
		if (processes.length == 0) callback();
	};
	const expDirs = fs.readdirSync(experimentsDir);
	expDirs.forEach(expDir => {
		expDir = path.join(experimentsDir, expDir);
		try {
			const expConfig = jsYaml.safeLoad(path.join(expDir, 'config.yaml'));
			const controllers = expConfig.apiControllers;
			controllers.forEach(controller => {
				const location = path.join(expDir, controller.location);
				const packedFile = execSync('npm pack', { cwd: location });
				const packedTGZ = path.join(location, packedFile);
				const mainContrDir = path.join(coreDir, 'api/src/controllers');
				const newContrDir = path.join(mainContrDir, expConfig.shortName, controller.name);
				fs.mkdirSync(newContrDir, { recursive: true });
				const newContrPackage = path.join(newContrDir, 'pack.tgz');
				fs.copyFileSync(packedTGZ, newContrPackage);
				unzipAndUntar(newContrPackage);
				fs.unlinkSync(newContrPackage);
				fs.unlinkSync(packedFile);
				processes.push(true);
				exec('npm install', { cwd: newContrDir }, (err, stdout, stderr) => {
					finishIfPossible();
					if (err)
						console.error(`Failed on npm install of ${newContrDir}: ${stderr}`);
				});
			});
		} catch (e) {
			console.error(`Failed to load experiment in ${expDir}: ${e}`);
		}
	});
};
