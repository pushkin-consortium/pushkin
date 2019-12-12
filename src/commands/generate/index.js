import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec } from 'child_process';
import replace from 'replace-in-file';
import { templates } from './templates.js'
const got = require("got") // analog of curl
const shell = require('shelljs');

// This may be overly restrictive in some cases
const isValidExpName = name => (/^([a-zA-Z])([a-zA-Z0-9_])*$/.test(name));

export function listExpTemplates() {
	const templateNames = templates.map(t => (t.name))
	console.log(templateNames);
}

export async function getExpTemplate(experimentsDir, templateName, newExpName) {
	if (!isValidExpName(newExpName)) {
		console.error(`'${newExpName}' is not a valid name. Names must start with a letter and can only contain alphanumeric characters.`);
		return;
	}
	console.log(`Making ${newExpName} in ${experimentsDir}`);
	const newDir = path.join(experimentsDir, newExpName);
	if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()){
		console.error(`A directory in the experiments folder already exists with this name (${newExpName})`);
		return;
	}

	// download files
	let url
	for(let val in templates) {
		if (templates[val].name == templateName) { 
			url = templates[val].url;
		}
	}
	if (!url){
		console.error('There is no site template by that name. For a list, run "pushkin init list".');
		return;
	}
	fs.mkdirSync(newDir);
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
	shell.exec(`unzip temp.zip -d temp`);
	shell.rm(`temp.zip`);
	shell.mv(`temp/*`, `temp/temp`);
	shell.mv(`temp/temp/*`, `temp/`);
	shell.rm(`-rf`,`temp/temp`);
	shell.mv(`temp/*`, newDir);
}

export function initExperiment(expDir, expName) {
	if (!(fs.existsSync(expDir) && fs.lstatSync(expDir).isDirectory()))
		console.error(`There is no experiment directory with the name (${expName})`);
	// change all occurrences of "template" in filenames and contents to exp name
	const updateName = dir => {
		fs.readdirSync(dir).forEach(el => {
			el = path.join(dir, el);
			if (fs.lstatSync(el).isDirectory()) {
				updateName(el); //notice this function calls itself recursively
				return;
			}
			const newBase = path.basename(el).replace(/pushkintemplate/g, expName);
			const newName = path.join(path.dirname(el), newBase);
			fs.renameSync(el, newName);

			try { replace.sync({ files: path.join(dir, '*'), from: /pushkintemplate/g, to: expName }); }
			catch (e) { console.error(e); }
		});
	};
	updateName(expDir);

	// specific to this experiment (some might not need a build phase, for example)
	['api controllers', 'web page', 'worker'].forEach(dir => {
		console.log(`Installing npm dependencies for ${dir}`);
		exec('npm install', { cwd: path.join(expDir, dir) }, err => {
			if (err)
				console.error(`Failed to install npm dependencies for ${dir}: ${err}`);
			if (dir == 'worker') return;
			console.log(`Building ${dir}`);
			exec('npm run build', { cwd: path.join(expDir, dir) }, err => {
				if (err)
					console.error(`Failed to build ${dir}:\n\t${err}`);
			});
		});
	});
};