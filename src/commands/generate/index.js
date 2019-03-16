import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { exec } from 'child_process';

export default (experimentsDir, newExpName) => {
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

			});
		});

	// 3. replace "template" with the quiz name
};
