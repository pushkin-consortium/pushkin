// Before compile time (prep time), this (and everything else in this folder) is moved to
// ${pushkin_front_end_quizzes_dir}, so all paths to modules located outside of this
// folder are relative to that root

import React from 'react';
import { browserHistory } from 'react-router';

import s from './styles.scss';
import jsPsychStyles from '../libraries/jsPsych/css/jspsych.css';
import { buildTimeline } from './jspTimeline';
import loadScript from './scriptLoader';
import localAxios from './axiosConfigInitial';

export default class MiniExample extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			JSPLoading: true,
			showThanks: false
		};
	};

	componentDidMount() {
		this.loadJsPsych()
			.then(_ => {
				this.setState({ JSPLoading: false });
				this.startExperiment();
			})
			.catch(err => {
				console.log(`failed to load jsPsych: ${err}`);
			});
	};

	loadJsPsych() {
		console.log('loadJsPsych');
		const jsPsychMainScript = 'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/jspsych.js';
		const jsPsychPlugins = [
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-button-response.js',
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-instructions.js',
		];

		// just for logging purposes
		const loadCounter = (total => {
			let nLoaded = 0;
			return () => {
				nLoaded++;
				console.log(`loaded ${nLoaded}/${total} plugins for jsPsych`);
			};
		})(jsPsychPlugins.length);


		// load jsPsych stuff from CDNs
		// main script must load before the plugins do
		return loadScript(jsPsychMainScript, () => console.log('jsPsych core loaded'))
			.then(r => {
				const pluginPromises = jsPsychPlugins.map(src => loadScript(src, loadCounter));
				return Promise.all(pluginPromises);
			});
	}

	
	async startExperiment() {
		browserHistory.listen(jsPsych.endExperiment);

		// createUser (-> user_id)
		let user_id;
		try {
			user_id = (await localAxios.post('/createUser')).data.resData;
			this.setState({ user_id });
			console.log(`user id: ${user_id}`);
			jsPsych.data.addProperties({ user_id });

		} catch (e) {
			alert('Could not start exeriment. Failed to create new user:');
			console.log(e);
			return;
		}

		// startExperiment(user_id)
		// (let worker prep the database)
		try { await localAxios.post('/startExperiment', { user_id }); }
		catch (e) { alert('failed to startExperiment'); console.log(e); return; }

		// getStimuliForUser(user_id), create the timeline, and start
		let stimuli;
		let meta;
		try {
			meta = await localAxios.post('/getMetaForUser', { user_id });
			stimuli = await localAxios.post('/getStimuliForUser', { user_id });
			const timeline = buildTimeline(meta, stimuli);

			jsPsych.init({
				display_element: this.refs.jsPsychTarget,
				timeline: timeline,
				on_finish: data => {
					this.endExperiment()
				}
			});
		} catch (e) {
			alert('failed to get timeline trial data');
			console.log(e);
			return;
		}
	}

	endExperiment() {
		this.setState({ showThanks: true });
	}

	render() {
		const thanks = (<h1>Thanks for participating</h1>);

		return (
			<div id="jsPsychContainer"> 
				{ this.state.JSPLoading ?
						(<h1>Loading...</h1>) :
						(<div ref="jsPsychTarget"></div>) }
				{ this.state.showThanks && thanks }
			</div>
		);
	}
}
