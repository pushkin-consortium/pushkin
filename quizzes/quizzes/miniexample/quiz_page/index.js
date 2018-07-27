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
require('../libraries/jsPsych/jspsych.js');
require('../libraries/jsPsych/plugins/jspsych-instructions.js');

export default class MiniExample extends React.Component {

	constructor(props) {
		super(props);
		browserHistory.listen(jsPsych.endExperiment);
	};

	componentDidMount() {
		// load jsPsych stuff from CDNs
		const jsPsychScripts = [
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/jspsych.js',
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-button-response.js',
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-instructions.js'
		];

		const allLoaded = (() => {
			let nLoaded = 0;
			const total = jsPsychScripts.length;
			return () => {
				nLoaded++;
				console.log(`total: ${total}, nLoaded: ${nLoaded}`);
				if (nLoaded >= total) {
					console.log('jsPsych scripts loaded');
					this.startExperiment();
				}
			};
		})();

		jsPsychScripts.forEach(scriptSrc => {
			const jsp = document.createElement('script');
			jsp.onload = allLoaded;
			jsp.src = scriptSrc;
			document.body.appendChild(jsp);
		});
	};
	async startExperiment() {
		try {
			console.log('getting user id');
			const temp = await localAxios.post('/createUser');
			console.log(temp);
			const user_id = temp.resData;
			console.log(`got user id: ${user_id}`);
			jsPsych.data.addProperties({ user_id });

			const timeline = rawTimeline.map(trial => ({
				...trial,
				on_finish: data => {
					const postData = {
						user_id: data.user_id,
						data_string: data
					};
					localAxios.post('/response', postData)
						.then(r => console.log('stimResp success'))
						.catch(e => console.log(e));
				}
			}));

			jsPsych.init({
				display_element: this.refs.jsPsychTarget,
				timeline: timeline
			});

		} catch (e) {
			alert('Could not start exeriment. Failed to create new user.');
			console.log(e);
		}
	}

	render() {
		return (
			<div id="jsPsychContainer"> 
				<div ref="jsPsychTarget"></div>
			</div>
		);
	}
}
