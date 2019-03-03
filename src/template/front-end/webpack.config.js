process.traceDeprecation = true;

const path = require('path');
const webpack = require('webpack');
const pkg = require('./package.json');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const commandLineArgs = require('command-line-args');

const argOptions = [
	{ name: 'debug', alias: 'd', type: Boolean, defaultValue: process.env.NODE_ENV == 'development' },
	{ name: 'verbose', alias: 'v', type: Boolean },
	{ name: 'hmr', alias: 'h', type: Boolean },
	{ name: 'google_analytics_site_id', alias: 'g', type: String, defaultValue: process.env.GOOGLE_ANALYTICS_SITE_ID },
	{ name: 'publicPath', alias: 'p', type: String, defaultValue: process.env.CLOUDFRONT_URL },
];
const args = commandLineArgs(argOptions);

const babelConfig = { 
	...pkg.babel,
	babelrc: true,
	cacheDirectory: args.hmr,
	plugins: [
		...(args.debug && args.hmr ? ['react-hot-loader/babel'] : [])
	]
};



args.debug = true;





// Webpack configuration (main.js => build/main.{hash}.js)
// http://webpack.github.io/docs/configuration.html
const config = {
	node: { fs: 'empty' },
	mode: args.debug ? 'development' : 'production',

	context: path.resolve(__dirname), // The base directory for resolving the entry option

	entry: [
		'./src/site/main.js',
		...(args.debug && args.hmr ?  ['react-hot-loader/patch', 'webpack-host-middleware/client'] : [])
	],

	output: {
		path: path.resolve(__dirname, 'build'),
		publicPath: args.debug ? '' : args.publicPath, // where bundled files are uploaded on server
		filename: '[name].[hash].js',
		chunkFilename: '[id].[chunkhash].js',
	},

	// Switch loaders to debug or release mode
	// Developer tool to enhance debugging, source maps
	// http://webpack.github.io/docs/configuration.html#devtool
	devtool: args.debug ? 'eval-source-map' : false,

	// What information should be printed to the console
	stats: {
		colors: true,
		reasons: args.debug,
		hash: args.verbose,
		version: args.verbose,
		timings: true,
		chunks: args.verbose,
		chunkModules: args.verbose,
		cached: args.verbose,
		cachedAssets: args.verbose
	},

	// Options affecting the normal modules
	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: [new RegExp('jsPsych'), /node_modules/],
				use: [ { loader: 'babel-loader', options: babelConfig } ]
			},
			{
				test: /\.css/,
				use: [ { loader: 'style-loader' },
					{
						loader: 'css-loader',
						options: {
							sourceMap: args.debug,
							modules: true, // CSS Modules https://github.com/css-modules/css-modules
							localIdentName: args.debug
							? '[name]_[local]_[hash:base64:3]'
							: '[hash:base64:4]',
							minimize: !args.debug // CSS Nano http://cssnano.co/options/
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
							sourceMap: args.debug,
							// CSS Modules https://github.com/css-modules/css-modules
							modules: true,
							localIdentName: args.debug ? '[name]_[local]_[hash:base64:3]' : '[hash:base64:4]',
							minimize: !args.debug // CSS Nano http://cssnano.co/options/
						}
					}
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
				use: [ { loader: 'file-loader', options: { limit: 10000 } } ]
			},
			{
				test: /\.(eot|ttf|wav|mp3|mp4)$/,
				use: 'file-loader'
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './src/site/index.html',
			title: 'My Pushkin Site',
			options: {
				debug: args.debug,
				trackingID: args.google_analytics_site_id,
			}
		}),
		...(args.debug ? [] : [new webpack.optimize.AggressiveMergingPlugin()]),
		...(args.debug && args.hmr ? [
			new webpack.HotModuleReplacementPlugin(),
			new webpack.NoEmitOnErrorsPlugin()
		] : [])
	],
	optimization: {
		minimize: !args.debug
	}
};

module.exports = config;
