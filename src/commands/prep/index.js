import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import { execSync, exec } from 'child_process';
import zlib from 'zlib';

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
			const controllers = expConfig.apiControllers;
			controllers.forEach(controller => {
				console.log(`Loading controller ${controller}`);
				const fullContrLoc = path.join(expDir, controller.location);
				console.log(`Location ${fullContrLoc}`);
				const packedFile = execSync('npm pack', { cwd: fullContrLoc }).toString().trim();
				const packedTGZ = path.join(fullContrLoc, packedFile);
				console.log(`Packed file ${packedFile}`);
				const mainContrDir = path.join(coreDir, 'api/src/controllers');
				const newContrDir = path.join(mainContrDir, expConfig.shortName, controller.name);
				fs.mkdirSync(newContrDir, { recursive: true });
				const newContrPackage = path.join(newContrDir, 'pack.tgz');
				fs.copyFileSync(packedTGZ, newContrPackage);

				processes.push(true);
				unzipAndUntar(newContrPackage, 1, err => {
					if (err) {
						console.error(`Failed to unpackage controller package: ${err}`);
						finishIfPossible();
						return;
					}
					fs.unlinkSync(newContrPackage);
					fs.unlinkSync(path.join(fullContrLoc, packedFile));
					processes.push(true);
					exec('npm install', { cwd: newContrDir }, (err, stdout, stderr) => {
						if (err)
							console.error(`Failed on npm install of ${newContrDir}: ${stderr}`);
						finishIfPossible();
					});
					finishIfPossible();
				});
			});
		} catch (e) {
			console.error(`Failed to load experiment in ${expDir}: ${e}`);
		}
	});
};
