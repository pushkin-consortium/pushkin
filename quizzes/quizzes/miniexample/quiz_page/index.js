// Before compile time (prep time), this (and everything else in this folder) is moved to
// ${pushkin_front_end_quizzes_dir}, so all paths to modules located outside of this
// folder are relative to that root

import React from 'react';
import { browserHistory } from 'react-router';

import s from './styles.scss';
import jsPsychStyles from '../libraries/jsPsych/css/jspsych.css';
import rawTimeline from './jsPsychTimeline';
import localAxios from './axiosConfigInitial';

// jsPsych isn't actually a "module" like normal modules are in node/commonJS
// it needs to be required globally and not assigned to a variable
//require('../libraries/jsPsych/jspsych.js');
//require('../libraries/jsPsych/plugins/jspsych-instructions.js');

export default class MiniExample extends React.Component {

	constructor(props) {
		super(props);
		this.state = { jsPsychLoaded: false };
	};

	componentDidMount() {
		this.loadJsPsych()
			.then(_ => {
				this.setState({ jsPsychLoaded: true });
				this.startExperiment();
			})
			.catch(err => {
				console.log(`failed to load jsPsych: ${err}`);
			});
	};

	loadJsPsych() {
		return new Promise( (resolve, reject) => {
			setTimeout(() => reject('jsPsych loading timed out'), 2000);

			// load jsPsych stuff from CDNs
			// main script must load before the plugins do
			const jsPsychMainScript = 'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/jspsych.js';
			const jsPsychPlugins = [
				'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-button-response.js',
				'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-instructions.js',
			];

			const allLoaded = (() => {
				let nLoaded = 0;
				const total = jsPsychScripts.length;
				return () => {
					nLoaded++;
					console.log(`loaded ${nLoaded}/${total} plugins for jsPsych`);
					if (nLoaded >= total) resolve();
				};
			})();

			const main = document.createElement('script');
			main.onload = () => {
				jsPsychScripts.forEach(scriptSrc => {
					const jsp = document.createElement('script');
					jsp.onload = allLoaded;
					jsp.src = scriptSrc;
					document.body.appendChild(jsp);
				});
			};
			main.src = jsPsychMainScript;
		});
	}

	async startExperiment() {
		browserHistory.listen(jsPsych.endExperiment);
		try {
			console.log('getting user id');
			const user_id = (await localAxios.post('/createUser')).data.resData;
			console.log(`user id: ${user_id}`);
			jsPsych.data.addProperties({ user_id });
		} catch (e) {
			alert('Could not start exeriment. Failed to create new user:');
			console.log(e);
		}
		const timeline = rawTimeline.map(trial => ({
			...trial,
			on_finish: data => {
				const postData = {
					user_id: data.user_id,
					data_string: data
				};
				try {
					localAxios.post('/response', postData);
				} catch (e) {
					console.log('Error posting to response API:');
					console.log(e);
				}
			}
		}));

		jsPsych.init({
			display_element: this.refs.jsPsychTarget,
			timeline: timeline
		});

	}

	render() {
		return (
			<div id="jsPsychContainer"> 
				{ this.state.jsPsychLoaded ?
						(<div ref="jsPsychTarget"></div>) :
						(<h1>Loading...</h1>) }
			</div>
		);
	}
}
