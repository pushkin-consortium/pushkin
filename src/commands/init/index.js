import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec} from 'child_process';
import { templates } from './templates.js'
const got = require("got") // analog of curl
const shell = require('shelljs');

export function listSiteTemplates() {
	const templateNames = templates.map(t => (t.name))
	console.log(templateNames);
}

export async function getPushkinSite(initDir, template) {
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

	// download files
	let url
	for(let val in templates) {
		if (templates[val].name == template) { 
			url = templates[val].url;
		}
	}
	if (!url){
		throw new Error('There is no site template by that name. For a list, run "pushkin init list".');
	}
	console.log("retrieving from "+url)
	console.log("be patient...")
	let zipball_url;
    try {
        const response = await got(url);
        zipball_url = JSON.parse(response.body).zipball_url;
    } catch (error) {
        console.log(error.response.body);
        throw new Error('Problem parsing github JSON');
    }
	shell.exec(`wget `+zipball_url+` -O temp.zip`);
	shell.exec(`unzip temp.zip -d .`);
	shell.rm(`temp.zip`)
	shell.mv(`*`, `temp`);
	shell.mv(`temp/*`, `.`); 
	shell.rm(`-rf`,`temp`); 
	shell.mv(`pushkin/pushkin.yaml.bak`,`./pushkin.yaml`); 
	shell.mv(`pushkin/config.js.bak`, `pushkin/front-end/src/config.js`);
	shell.mkdir(`experiments`)
	return true;
};

export async function pushkinInit(initDir) {
	['api', 'front-end'].forEach(dir => {
		// For 'api' and 'front-end', run 'npm install', which will install according to the package.json for each.
		console.log(`Installing npm dependencies for ${dir}`);
		exec('npm install', { cwd: path.join(initDir, 'pushkin', dir) }, err => {
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
};





