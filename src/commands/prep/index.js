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
		const uniqueName = `pushkinComponent${uuid().split('-').join('')}`;
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


// two sketchy methods to handle writing pure js for static imports
const getModuleList = file => { // eslint-disable-line
	const moduleNames = [];
	const data = fs.readFileSync(file, 'utf8').trim();
	data.split('\n').forEach(line => {
		const spaces = line.split(' ');
		if (spaces[0] == 'import') moduleNames.push(spaces[1]);
	});
	return moduleNames;
};
const includeInModuleList = (importName, listAppendix, file) => {
	const data = fs.readFileSync(file, 'utf8').trim();
	const lineSplit = data.split('\n');
	const allButEnd = lineSplit.slice(0, lineSplit.length - 1);
	const newData =
`import ${importName} from '${importName}';
${allButEnd.join('\n')}
	${listAppendix},
];`;
	fs.writeFileSync(file, newData, 'utf8');
};


// reset controllers, web pages, workers to be included in main build
const cleanUp = (coreDir, callback) => {
	// task management
	const fail = (reason, err) => { callback(new Error(`${reason}: ${err}`)); };
	const tasks = [];
	const startTask = () => { tasks.push(true); };
	const finishTask = () => {
		tasks.pop();
		if (tasks.length == 0) callback();
	};


	// reset api controllers
	const controllersJsonFile = path.join(coreDir, 'api/src/controllers.json');
	startTask();
	fs.readFile(controllersJsonFile, 'utf8', (err, data) => {
		let oldContrList;
		try { oldContrList = JSON.parse(data); }
		catch (e) { return fail('Failed to parse controllers.json', e); }
		oldContrList.forEach(contr => {
			const moduleName = contr.name;
			startTask();
			exec(`npm uninstall ${moduleName}`, { cwd: path.join(coreDir, 'api') }, err => {
				if (err)
					return fail(`Failed to uninstall old controller ${moduleName}`, err);
				finishTask(); // uninstalling old module
			});
		});
		fs.writeFile(controllersJsonFile, JSON.stringify([]), 'utf8', err => {
			if (err)
				return fail('Failed to clear controllers.json', err); 
			finishTask(); // overwriting controllers json file (making blank)
		});
		finishTask(); // reading old controllers json file
	});


	// reset web page dependencies
	let oldPages;
	try { oldPages = getModuleList(webPageAttachListFile); }
	catch (e) { return fail('Failed to read web page attachment list', e); }
	oldPages.forEach(page => {
		const moduleName = page.name;
		startTask();
		exec(`npm uninstall ${moduleName}`, {cwd: path.join(coreDir, 'front-end') }, err => {
			if (err)
				return fail(`Failed to uninstall old controller ${moduleName}`, err);
			finishTask(); // uninstalling old module
		});
	});
	// overwrite the old list of attachment files
	const webPageAttachListFile = path.join(coreDir, 'front-end/src/experiments.js');
	fs.writeFile(webPageAttachListFile, 'export default [\n];', 'utf8', err => {
		if (err)
			return fail('Failed to uninstall old experiment web pages from front end', err);
		finishTask();
	});


	// remove workers from main docker compose file
	const composeFileLoc = path.join(coreDir, 'docker-compose.dev.yml');
	let compFile;
	try { compFile = jsYaml.safeLoad(fs.readFileSync(composeFileLoc), 'utf8'); }
	catch (e) { return fail('Failed to load main docker compose file', e); }
	Object.keys(compFile.services).forEach(service => {
		service = compFile.services[service];
		if (service.labels && service.labels.isPushkinWorker)
			delete compFile.services[service];
	});
	let newCompData;
	try { newCompData = jsYaml.safeDump(compFile); }
	catch (e) { return fail('Failed to create new compose file without old workers', e); }
	startTask();
	fs.writeFile(composeFileLoc, newCompData, 'utf8', err => {
		if (err)
			return fail('Failed to write new compose file without old workers', err);
		finishTask();
	});
};


// prepare a single experiment's api controllers
const prepApi = (expDir, controllerConfigs, coreDir, callback) => {
	// task management
	const fail = (reason, err) => { callback(new Error(`${reason}: ${err}`)); };
	const tasks = [];
	const startTask = () => { tasks.push(true); };
	const contrListAppendix = [];
	const finishTask = () => {
		tasks.pop();
		if (tasks.length == 0) {
			callback(undefined, contrListAppendix);
		}
	};

	controllerConfigs.forEach(controller => {
		const fullContrLoc = path.join(expDir, controller.location);
		console.log(`Loading controller in ${fullContrLoc}`);
		startTask();
		packAndInstall(fullContrLoc, path.join(coreDir, 'api'), (err, moduleName) => {
			if (err)
				return fail(`Failed on prepping api controller ${fullContrLoc}:`, err);
			contrListAppendix.push({ name: moduleName, mountPath: controller.mountPath });
			finishTask(); // packing and installing controller
		});
	});
};

// prepare a single experiment's web page
const prepWeb = (expDir, expConfig, coreDir, callback) => {
	const webPageLoc = path.join(expDir, expConfig.webPage.location);
	packAndInstall(webPageLoc, path.join(coreDir, 'front-end'), (err, moduleName) => {
		if (err) {
			callback(`Failed on prepping web page: ${err}`);
			return;
		}

		// this must be one line
		const modListAppendix = `{ fullName: '${expConfig.experimentName}', shortName: '${expConfig.shortName}', module: ${moduleName} }`;
		callback(undefined, modListAppendix);
	});
};

// prepare a single experiment's worker
const prepWorker = (expDir, workerConfig, callback) => {
	const workerService = workerConfig.service;
	const workerName = `pushkinWorker${uuid().split('-').join('')}`;
	const workerLoc = path.join(expDir, workerConfig.location);
	exec(`docker build ${workerLoc} -t ${workerName}`, err => {
		if (err) {
			callback(new Error(`Failed to build worker: ${err}`));
			return;
		}
		callback(undefined, { serviceName: workerName, serviceContent: workerService });
	});
};



// the main prep function for prepping all experiments
export default (experimentsDir, coreDir, callback) => {
	// task management
	const fail = (reason, err) => { callback(new Error(`${reason}: ${err}`)); };
	const tasks = [];
	const startTask = () => { tasks.push(true); };
	// keep track of stuff to write out
	const newApiControllers = []; // { name (module name), mountPath } list
	const newWebPageIncludes = []; // { moduleName:string, listAppendix:string } list
	const newWorkerServices = []; // to add to main compose file (tag with label of isPushkinWorker) { serviceName, serviceContent } list
	const finishTask = () => {
		tasks.pop();
		if (tasks.length == 0) {

			// write out api includes
			const controllersJsonFile = path.join(coreDir, 'api/src/controllers.json');
			try { fs.writeFileSync(controllersJsonFile, JSON.stringify(newApiControllers), 'utf8'); }
			catch (e) { return fail('Failed to write api controllers list', e); }

			// write out web page includes
			try { 
				const webPageAttachListFile = path.join(coreDir, 'front-end/src/experiments.js');
				newWebPageIncludes.forEach(include => {
					includeInModuleList(include.moduleName, include.listAppendix, webPageAttachListFile);
				});
			}
			catch (e) { return fail('Failed to include web pages in front end', e); }

			// write out new compose file with worker services
			const composeFileLoc = path.join(coreDir, 'docker-compose.dev.yml');
			let compFile;
			try { compFile = jsYaml.safeLoad(fs.readFileSync(composeFileLoc), 'utf8'); }
			catch (e) { return fail('Failed to load main docker compose file', e); }
			newWorkerServices.forEach(workService => {
				compFile.services[workService.serviceName] = workService.serviceContent;
			});
			let newCompData;
			try { newCompData = jsYaml.safeDump(compFile); }
			catch (e) { return fail('Failed to create new compose file without old workers', e); }
			try { fs.writeFileSync(composeFileLoc, newCompData, 'utf8'); }
			catch (e) { return fail('Failed to write new compose file without old workers', e); }

			callback();
		}
	};



	/******************************* begin *******************************/
	// clean up old experiment stuff
	cleanUp(coreDir, err => {
		if (err)
			return fail('Failed to clean up old experiments from core', err);
		const expDirs = fs.readdirSync(experimentsDir);

		expDirs.forEach(expDir => {
			// load the config file
			expDir = path.join(experimentsDir, expDir);
			const expConfigPath = path.join(expDir, 'config.yaml');
			let expConfig;
			try { expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); }
			catch (e) { return fail(`Failed to load config file for ${expDir}`, e); }

			// api
			startTask();
			prepApi(expDir, expConfig.apiControllers, coreDir, (err, contrListAppendix) => {
				if (err)
					return fail(`Failed to prep api for ${expDir}`, err);
				newApiControllers.push(contrListAppendix);
				finishTask();
			});

			// web page
			startTask();
			prepWeb(expDir, expConfig, coreDir, (err, webListAppendix) => {
				if (err)
					return fail(`Failed to prep web page for ${expDir}`, err);
				newWebPageIncludes.push(webListAppendix);
				finishTask();
			});

			// worker
			startTask();
			prepWorker(expDir, expConfig.worker, (err, workerAppendix) => {
				if (err)
					return fail(`Failed to prep worker for ${expDir}`, err);
				newWorkerServices.push(workerAppendix);
				finishTask();
			});
		});
	});
};
