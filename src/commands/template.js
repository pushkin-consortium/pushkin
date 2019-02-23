import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import tar from 'tar';

export default () => {
	try {
		const zipFile = path.join(__dirname, '../template.tar.gz');
		const zipOutput = path.join(process.cwd(), 'template');

		const contentStream = fs.createReadStream(zipFile);
		const writeStream = fs.createWriteStream(zipOutput);
		contentStream.pipe(zlib.createGunzip()).pipe(writeStream).on('finish', err => {
			if (err) throw err;
			console.log('unzipped');
			tar.x({ file: zipOutput, strip: 2 })
				.then(() => {
					console.log('tar success');
				})
				.catch(err => {
					console.error(err);
				});
		});


	} catch (e) {
		console.error('Failed to extract template files');
		console.error(e);
	}
};
