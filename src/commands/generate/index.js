import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec } from 'child_process';
import replace from 'replace-in-file';

// This may be overly restrictive in some cases
const isValidExpName = name => (/^([a-zA-Z])([a-zA-Z0-9_])*$/.test(name));

export default (experimentsDir, newExpName) => {
	if (!isValidExpName(newExpName)) {
		console.error(`'${newExpName}' is not a valid name. Names must start with a letter and can only contain alphanumeric characters.`);
		return;
	}
	console.log(`${experimentsDir}, name: ${newExpName}`);
	const newDir = path.join(experimentsDir, newExpName);
	console.log(`newDir ${newDir}`);
	if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory())
		throw new Error(`A directory in the experiments folder already exists with this name (${newExpName})`);

	fs.mkdirSync(newDir);
	const template = path.join(__dirname, 'generateFiles/template.tar.gz');
	const zipOutput = path.join(newDir, 'template.tar');
	const contentStream = fs.createReadStream(template);
	const writeStream = fs.createWriteStream(zipOutput);
	console.log('Unzipping template files');
	contentStream
		.pipe(zlib.createGunzip())
		.pipe(writeStream)
		.on('finish', err => {
			if (err)
				throw new Error(`Failed to unzip core files: ${err}`);
			console.log('Untarring template files');
			/*******/ process.chdir(newDir); /********/
			exec(`tar -xf ${zipOutput} --strip-components=5`, err => {
				if (err)
					throw new Error(`Failed to extract tarball: ${err}`);
				fs.unlink(zipOutput, err => {
					if (err) throw new Error(`Failed to delete tarball: ${err}`);
				});

				// change all occurrences of "template" in filenames and contents to exp name
				const updateName = dir => {
					console.log(`NAME UPDATE ${dir}`);
					fs.readdirSync(dir).forEach(el => {
						el = path.join(dir, el);
						if (fs.lstatSync(el).isDirectory()) {
							updateName(el);
							return;
						}
						const newBase = path.basename(el).replace(/template/g, newExpName);
						const newName = path.join(path.dirname(el), newBase);
						fs.renameSync(el, newName);

						try { replace.sync({ files: path.join(dir, '*'), from: /template/g, to: newExpName }); }
						catch (e) { console.error(e); }
					});
				};
				updateName(newDir);
				['api controllers', 'web page', 'worker'].forEach(dir => {
					console.log(`Installing npm dependencies for ${dir}`);
					exec('npm install', { cwd: path.join(newDir, dir) }, err => {
						if (err)
							console.error(`Failed to install npm dependencies for ${dir}: ${err}`);
					});
				});
			});
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

