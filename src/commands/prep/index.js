import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import { execSync, exec } from 'child_process'; // eslint-disable-line
import uuid from 'uuid/v4';

// give package unique name, package it, npm install on installDir, return module name
const packAndInstall = (packDir, installDir, callback) => {
	// task management
	const fail = (reason, err) => {
		callback(new Error(`${reason} (${packDir}, ${installDir}): ${err}`));
	};
	const tasks = [];
	const startTask = () => { tasks.push(true); };
	let finalModuleName;
	const finishTask = moduleName => {
		if (moduleName) finalModuleName = moduleName;
		tasks.pop();
		if (tasks.length == 0) {
			if (!moduleName)
				return fail('Internal error: no final module name returned');
			callback(undefined, finalModuleName);
		}
	};

	// backup the package json
	const packageJsonPath = path.join(packDir, 'package.json');
	const packageJsonBackup = path.join(packDir, 'package.json.bak');
	try { fs.copyFileSync(packageJsonPath, packageJsonBackup); }
	catch (e) { return fail('Failed to backup package.json', e); }

	// give package a unique name to avoid module conflicts
	startTask();
	fs.readFile(packageJsonPath, 'utf8', (err, data) => {
		let packageJson;
		try { packageJson = JSON.parse(data); }
		catch (e) { return fail('Failed to parse package.json', e); }
		const uniqueName = `pushkinComponent-${uuid()}`;
		packageJson.name = uniqueName;
		startTask();
		fs.writeFile(packageJsonPath, JSON.stringify(packageJson), 'utf8', err => {
			if (err)
				return fail('Failed to write new package.json', err);

			// package it up
			startTask();
			exec('npm pack', { cwd: packDir }, (err, stdout, stdin) => { // eslint-disable-line
				if (err)
					return fail('Failed to run npm pack', err);
				const packedFileName = stdout.toString().trim();
				const packedFile = path.join(packDir, packedFileName);
				const movedPack = path.join(installDir, packedFileName);

				// move the package to the installDir
				startTask();
				fs.rename(packedFile, movedPack, err => {
					if (err)
						return fail(`Failed to move packaged file (${packedFileName} => ${movedPack})`, err);

					// restore the unmodified package.json
					startTask();
					fs.unlink(packageJsonPath, err => {
						if (err)
							return fail(`Failed to delete ${packageJsonPath}`, err);
						try { fs.renameSync(packageJsonBackup, packageJsonPath); }
						catch (e) { return fail('Failed to restore package.json backup', e); }
						finishTask(); // deleting modified package.json
					});

					// install package to installDir
					startTask();
					exec(`npm install "${packedFileName}"`, { cwd: installDir }, err => {
						if (err)
							return fail(`Failed to run npm install ${packedFileName}`, err);
						// delete the package file
						try { fs.unlinkSync(path.join(installDir, packedFileName)); }
						catch (e) { return fail('Failed to delete packaged file in installDir', e); }
						finishTask(uniqueName); // npm install [package bundle] in installDir
					});
					finishTask(); // moving package to installDir
				});
				finishTask(); // npm pack
			});
			finishTask(); // write new package file
		});
		finishTask(); // read package file
	});
};
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
	// task management
	const fail = (reason, err) => { callback(new Error(`${reason}: ${err}`)); };
	const tasks = [];
	const startTask = () => { tasks.push(true); };
	const finishTask = () => {
		tasks.pop();
		if (tasks.length == 0) callback();
	};

	// for each experiment...
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
			// remove old controller names and uninstall from api's dependencies
			const controllersJsonFile = path.join(coreDir, 'api/src/controllers.json');
			startTask();
			fs.readFile(controllersJsonFile, 'utf8', (err, data) => {
				if (err)
					return fail('Failed to read old controllers.json for api', err);
				let oldContrList;
				try { oldContrList = JSON.parse(data); }
				catch (e) { return fail('Failed to parse controllers.json', e); }
				oldContrList.forEach(contr => {
					const moduleName = contr.name;
					startTask();
					exec(`npm uninstall ${moduleName}`, err => {
						if (err)
							return fail(`Failed to uninstall old controller ${moduleName}`, err);
						finishTask(); // uninstalling old module
					});
				});

				// overwrite the old list of controllers
				fs.writeFileSync(controllersJsonFile, JSON.stringify([]), 'utf8');

				// install the new controller in the core api
				const controllers = expConfig.apiControllers;
				controllers.forEach(controller => {
					const fullContrLoc = path.join(expDir, controller.location);
					console.log(`Loading controller in ${fullContrLoc}`);
					startTask();
					packAndInstall(fullContrLoc, path.join(coreDir, 'api'), (err, moduleName) => {
						if (err)
							return fail(`Failed on prepping api controller ${fullContrLoc}:`, err);

						// add this controller to the main api's list of controllers to attach
						let attachList;
						try { attachList = JSON.parse(fs.readFileSync(controllersJsonFile)); }
						catch (e) { return fail('Failed to parse controllers.json', e); }
						attachList.push({ name: moduleName, mountPath: controller.mountPath });
						fs.writeFileSync(controllersJsonFile, JSON.stringify(attachList), 'utf8');
						finishTask(); // packing and installing controller
					});
				});
				finishTask(); // reading old json controller's file
			});


			// web page
			const webPageLoc = path.join(expDir, expConfig.webPage.location);
			// uninstall old web page experiments
			const webPageAttachListFile = path.join(coreDir, 'front-end/src/experiments.json');
			startTask();
			fs.readFile(webPageAttachListFile, 'utf8', (err, data) => {
				let oldPages;
				try { oldPages = JSON.parse(data); }
				catch (e) { return fail('Failed to parse experiments.json', e); }
				oldPages.forEach(page => {
					const moduleName = page.name;
					startTask();
					exec(`npm uninstall ${moduleName}`, err => {
						if (err)
							return fail(`Failed to uninstall old controller ${moduleName}`, err);
						finishTask(); // uninstalling old module
					});
				});

				// overwrite the old list of pages
				fs.writeFileSync(webPageAttachListFile, JSON.stringify([]), 'utf8');

				// install the experiment web page to main site's modules
				startTask();
				packAndInstall(webPageLoc, path.join(coreDir, 'front-end'), (err, moduleName) => {
					if (err)
						return fail('Failed on prepping web page', err);

					// add this web page to the main list of pages to include
					let attachList;
					try { attachList = JSON.parse(fs.readFileSync(webPageAttachListFile)); }
					catch (e) { return fail('Failed to parse experiments.json', e); }
					attachList.push({ name: moduleName, mountPath: expConfig.webPage.name });
					fs.writeFileSync(webPageAttachListFile, JSON.stringify(attachList), 'utf8');
					finishTask(); // packing and installing web page
				});
				finishTask(); // reading in old web page list
			});
		} catch (e) {
			console.error(`Failed to load experiment in ${expDir}: ${e}`);
		}
	});
};
