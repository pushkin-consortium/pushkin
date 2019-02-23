import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import tar from 'tar';
import childProcess from 'child_process';

export default () => {
	const zipFile = path.join(__dirname, '../../template.tar.gz');
	const zipOutput = path.join(process.cwd(), 'template');

	const contentStream = fs.createReadStream(zipFile);
	const writeStream = fs.createWriteStream(zipOutput);
	contentStream
		.pipe(zlib.createGunzip())
		.pipe(writeStream)
		.on('finish', err => {
			if (err) throw err;
			console.log('unzipped');
			tar.x({ file: zipOutput, strip: 2 })
				.then(() => {
					const templateDirsForNPMInstall = ['api', 'front-end', 'util', 'workers/templateWorker'];
					templateDirsForNPMInstall.forEach(dir => {
						childProcess.exec(
							'npm install',
							{ cwd: path.join(process.cwd(), dir) },
							err => { if (err) throw err; }
						);
					});
				})
				.catch(err => { console.error(err); });
		});
};
