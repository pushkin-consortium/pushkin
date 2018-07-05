process.traceDeprecation = true;

const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commandLineArgs = require('command-line-args');


const argOptions = [
	{ name: 'debug', alias: 'd', type: Boolean },
	{ name: 'verbose', alias: 'v', type: Boolean },
	{ name: 'publicPath', alias: 'p', type: String, defaultOption: '' },
];
const args = commandLineArgs(argOptions);

const isDebug = args.debug;
const isVerbose = args.verbose;
const useHMR = false; //!!global.HMR; // Hot Module Replacement (HMR)
const babelConfig = { 
	...pkg.babel,
	babelrc: true,
	cacheDirectory: useHMR
};

// Webpack configuration (main.js => dist/main.{hash}.js)
// http://webpack.github.io/docs/configuration.html
const config = {
	node: {
		fs: 'empty'
	},
	mode: isDebug ? 'development' : 'production',

	// The base directory for resolving the entry option
	context: path.resolve(__dirname),

	entry: [ './src/main.js' ],

	output: {
		path: path.resolve(__dirname, 'dist'),
		publicPath: isDebug ? '' : args.publicPath, // where bundled files are uploaded on server
		filename: '[name].[hash].js',
		chunkFilename: '[id].[chunkhash].js',
	},

	// Switch loaders to debug or release mode
	// Developer tool to enhance debugging, source maps
	// http://webpack.github.io/docs/configuration.html#devtool
	devtool: isDebug ? 'eval-source-map' : false,

	// What information should be printed to the console
	stats: {
		colors: true,
		reasons: isDebug,
		hash: isVerbose,
		version: isVerbose,
		timings: true,
		chunks: isVerbose,
		chunkModules: isVerbose,
		cached: isVerbose,
		cachedAssets: isVerbose
	},


	// Options affecting the normal modules
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: [new RegExp('jsPsych'), /node_modules/],
				use: [
					{
						loader: 'babel-loader',
						options: babelConfig
					}
				]
			},
			{
				test: /\.css/,
				use: [
					{
						loader: 'style-loader'
					},
					{
						loader: 'css-loader',
						options: {
							sourceMap: isDebug,
							// CSS Modules https://github.com/css-modules/css-modules
							modules: true,
							localIdentName: isDebug
							? '[name]_[local]_[hash:base64:3]'
							: '[hash:base64:4]',
							// CSS Nano http://cssnano.co/options/
							minimize: !isDebug
						}
					}
				]
			},
			{
				test: /\.scss$/, // sass
				use: [
					{ loader: 'style-loader' },
					{
						loader: 'css-loader',
						options: {
							sourceMap: isDebug,
							// CSS Modules https://github.com/css-modules/css-modules
							modules: true,
							localIdentName: isDebug
							? '[name]_[local]_[hash:base64:3]'
							: '[hash:base64:4]',
							// CSS Nano http://cssnano.co/options/
							minimize: !isDebug
						}
					},
					{ loader: 'sass-loader' }
				]
			},
			{
				test: /\.json$/,
				exclude: [path.resolve(__dirname, './routes.json')],
				loader: 'json-loader'
			},
			{
				test: /\.json$/,
				include: [path.resolve(__dirname, './routes.json')],
				loaders: [
					`babel-loader?${JSON.stringify(babelConfig)}`,
					path.resolve(__dirname, './utils/routes-loader.js')
				]
			},
			{
				test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ico)$/,
				use: [
					{
						loader: 'file-loader',
						options: {
							limit: 10000
						}
					}
				]
			},
			{
				test: /\.(eot|ttf|wav|mp3|mp4)$/,
				use: 'file-loader'
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './src/index.html',
			title: 'Games With Words',
//			template: 'src/index.ejs',
//			inject: 'body',
			options: {
				debug: isDebug,
				trackingID: process.env.GOOGLE_ANALYTICS_SITE_ID,
			}
		}),
		...(isDebug ? [] : [new webpack.optimize.AggressiveMergingPlugin()])
	],
	optimization: {
		minimize: !isDebug
	}
};

// Hot Module Replacement (HMR) + React Hot Reload
if (isDebug && useHMR) {
	babelConfig.plugins.unshift('react-hot-loader/babel');
	config.entry.unshift(
		'react-hot-loader/patch',
		'webpack-hot-middleware/client'
	);
	config.plugins.push(new webpack.HotModuleReplacementPlugin());
	config.plugins.push(new webpack.NoEmitOnErrorsPlugin());
}

module.exports = config;
