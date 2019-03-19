import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import { execSync, exec } from 'child_process';
import uuid from 'uuid/v4';

/* can use this in init/generate commands
const unzipAndUntar = (file, strips, callback) => {
	const inStream = fs.createReadStream(file);
	const outFile = path.join(path.dirname(file), `${path.basename(file)}.tempTar`);
	const outStream = fs.createWriteStream(outFile);
	inStream
		.pipe(zlib.createGunzip())
		.pipe(outStream)
		.on('finish', err => {
			if (err) return callback(new Error(`Failed to unzip file: ${err}`));
			exec(`tar -xf ${outFile} --strip-components=${strips}`, { cwd: path.dirname(file) }, err => {
				if (err) callback(new Error(`Failed to extract tarball: ${err}`));
				fs.unlink(outFile, err => {
					if (err) callback(new Error(`Failed to delete tarball: ${err}`));
					callback();
				});
			});
		});
};
*/

export default (experimentsDir, coreDir, callback) => {
	const processes = [];
	const finishIfPossible = () => {
		processes.pop();
		if (processes.length == 0) callback();
	};
	const expDirs = fs.readdirSync(experimentsDir);
	expDirs.forEach(expDir => {
		expDir = path.join(experimentsDir, expDir);
		if (!fs.lstatSync(expDir).isDirectory()) return;
		try {
			console.log(`Loading experiment in ${expDir}`);
			const expConfigPath = path.join(expDir, 'config.yaml');
			const expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8');
			console.log(expConfig);

			// api controllers
			// remove previous controllers.json list
			fs.writeFileSync(path.join(coreDir, 'api/src/controllers.json'), JSON.stringify([]));
			const controllers = expConfig.apiControllers;
			controllers.forEach(controller => {
				console.log(`Loading controller ${controller}`);
				const fullContrLoc = path.join(expDir, controller.location);
				console.log(`Location ${fullContrLoc}`);

				// give the package a unique name (avoid imports with the same name)
				const packageJsonPath = path.join(fullContrLoc, 'package.json');
				const packageJsonBackup = path.join(fullContrLoc, 'package.json.bak');
				fs.copyFileSync(packageJsonPath, packageJsonBackup);
				const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
				const uniqueContrName = `pushkinController-${uuid()}`;
				packageJson.name = uniqueContrName;
				fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson));

				// package it up
				const packedFile = execSync('npm pack', { cwd: fullContrLoc }).toString().trim();
				const packedTGZ = path.join(fullContrLoc, packedFile);
				console.log(`Packed file ${packedFile}`);
				fs.renameSync(packedTGZ, path.join(coreDir, 'api', packedFile));

				// restore original package.json
				fs.unlinkSync(packageJsonPath);
				fs.renameSync(packageJsonBackup, packageJsonPath);

				// install packaged controller to core api dependencies
				processes.push(true);
				exec(`npm install "${packedFile}"`, { cwd: path.join(coreDir, 'api') }, err => {
					if (err) {
						console.error(`Failed to install ${path.join(coreDir, 'api', packedFile)}: ${err}`);
						finishIfPossible();
						return;
					}
					fs.unlinkSync(path.join(coreDir, 'api', packedFile));
					finishIfPossible();
				});

				// add this controller to the main api's list of controllers to attach
				const attachListFile = path.join(coreDir, 'api/src/controllers.json');
				const attachList = JSON.parse(fs.readFileSync(attachListFile));
				attachList.push({ name: uniqueContrName, mountPath: controller.mountPath });
				fs.writeFileSync(attachListFile, JSON.stringify(attachList));
			});


			// web page
			// write src/experiments.json [{ mountPath, name }]
			// install each package to front-end/src

		} catch (e) {
			console.error(`Failed to load experiment in ${expDir}: ${e}`);
		}
	});
};
