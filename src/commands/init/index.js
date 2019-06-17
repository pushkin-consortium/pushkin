import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec} from 'child_process';

export default initDir => {
	process.chdir(initDir); //Node command to change directory

	const newDirs = ['pushkin', 'experiments'];
	const newFiles = ['pushkin.yaml'];

	// make sure nothing to be created already exists
	newDirs.forEach(d => {
		const dir = path.join(initDir, d);
		if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory())
			throw new Error(`Failed to initialize pushkin project: directory ${dir} already exists`);
	});
	newFiles.forEach(f => {
		const file = path.join(initDir, f);
		if (fs.existsSync(file) && !fs.lstatSync(file).isDirectory())
			throw new Error(`Failed to initialize pushkin project: file ${file} already exists`);
	});

	// go ahead and initialize
	newDirs.forEach(d => {
		if (d == 'pushkin') return; // do nothing
		const dir = path.join(initDir, d);
		fs.mkdirSync(dir); //creates directories for each 'd' in newDirs
	});
	const config = path.join(__dirname, 'initFiles/pushkin.yaml'); // __dirname is always the directory in which the currently executing script resides

	fs.copyFileSync(config, path.join(initDir, 'pushkin.yaml')); // copies generic 'pushkin.yaml' to project root

	// unzip/untar core files and run npm install where needed
	const coreBundle = path.join(__dirname, 'initFiles/pushkin.tar.gz');
	const zipOutput = path.join(process.cwd(), 'pushkin.tar');
	const contentStream = fs.createReadStream(coreBundle);
	const writeStream = fs.createWriteStream(zipOutput);
	console.log('Unzipping core files');
	contentStream
		.pipe(zlib.createGunzip())
		.pipe(writeStream)
		.on('finish', err => {
			if (err) throw new Error(`Failed to unzip core files: ${err}`);
			console.log('Untarring core files');
			exec(`tar -xf ${zipOutput} --strip-components=4`, err => {

				if (err) throw new Error(`Failed to extract tarball: ${err}`);
				fs.unlink(zipOutput, err => {
					if (err) console.error(`Failed to delete tarball: ${err}`);
				});

				['api', 'front-end'].forEach(dir => {
					// For 'api' and 'front-end', run 'npm install', which will install according to the package.json for each.
					console.log(`Installing npm dependencies for ${dir}`);
					exec('npm install', { cwd: path.join(process.cwd(), 'pushkin', dir) }, err => {
						if (err) throw new Error(`Failed to install npm dependencies for ${dir}: ${err}`);
						if (dir != 'api' && dir != 'front-end') return;
						console.log(`Building ${dir}`);
						exec('npm run build', { cwd: path.join(process.cwd(), 'pushkin', dir) }, err => {
							if (err) throw new Error(`Failed to build ${dir}: ${err}`);
						});
					});
				});

				console.log('Creating local test database');
				// note that pushkin/docker-compose.dev.yml defines a container called 'test_db', which gets fired up below
				exec('docker-compose -f pushkin/docker-compose.dev.yml up --no-start && docker-compose -f pushkin/docker-compose.dev.yml start test_db', err => {
					if (err) {
						console.error(`Failed to start test_db container: ${err}`);
						return;
					}
					//following command starts up a database called 'test_db' in the container 'test_db' (notice the overloading of the name)
					const command = `
						bash pushkin/waitforit.sh localhost:5432 -t 10 -- \
						docker-compose -f pushkin/docker-compose.dev.yml exec -T test_db psql -U postgres -c "create database test_db"
					`;
					exec(command, err => {
						if (err) {
							console.error(`Failed to run create database command in test_db container: ${err}`); // no return after
						} else {
							console.log('Created local test database successfully');
						}
						//Stop the container
						exec('docker-compose -f pushkin/docker-compose.dev.yml stop test_db', err => {
							if (err) console.error(`Failed to stop test_db container: ${err}`);
						});
					});
				});
			});
		});
};







