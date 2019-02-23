/* eslint-disable no-console */

const del = require('del');
const webpack = require('webpack');

const webpackConfig = require('./webpack.config.js');

// ---------------------------

let clean = () => {
	return del(['build/*', '!build/.git'], { dot: true });
};

let pack = () => {
	return new Promise( (resolve, reject) => {
		webpack(webpackConfig).run( (err, stats) => {
			if (err || stats.hasErrors()) {
				console.log(err || stats.toString()); 
				reject();
			} else {
				console.log(stats.toString(webpackConfig.stats)); 
				resolve();
			}
		});
	});
};

Promise.resolve()
	.then( () => { clean(); })
	.then( () => { pack(); })
	.catch( (err) => { console.log(err); }); 
