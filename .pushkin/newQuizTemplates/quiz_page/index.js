// Before compile time (prep time), this (and everything else in this folder) is moved to
// ${pushkin_front_end_quizzes_dir}, so all paths to modules located outside of this
// folder are relative to that root

import React from 'react';
import { browserHistory } from 'react-router';

import s from './styles.scss';
import jsPsychStyles from '../libraries/jsPsych/css/jspsych.css';
import { buildTimeline } from './jspTimeline';
import { loadScript, loadScripts } from './scriptLoader';
import localAxios from './axiosConfigInitial';

export default class ${QUIZ_NAME} extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			loading: true,
			showThanks: false
		};
	};

	componentDidMount() {
		this.loadJsPsych()
			.then(_ => {
				this.startExperiment();
			})
			.catch(err => {
				console.log(`failed to load jsPsych: ${err}`);
			});
	};

	loadJsPsych() {
		console.log('loadJsPsych');
		const jsPsychMainScript = 'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/jspsych.js';
		// these are all required by something in either jspTimeline or meta/stim stuff sent from the api
		const jsPsychPlugins = [
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-html-button-response.js',
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-instructions.js',
			'https://cdn.jsdelivr.net/gh/jspsych/jsPsych@6.0.4/plugins/jspsych-survey-text.js'
		];

		// load jsPsych stuff from CDNs
		// main script must load before the plugins do
		return loadScript(jsPsychMainScript, () => console.log('jsPsych core loaded'))
			.then(_ => {

				const message = (total => {
					let nLoaded = 0;
					return () => {
						nLoaded++;
						console.log(`loaded ${nLoaded}/${total} plugins for jsPsych`);
					}
				})(jsPsychPlugins.length);

				const srcsAndOnloads = jsPsychPlugins.map(p => ({
					src: p,
					onload: message
				}));

				return loadScripts(srcsAndOnloads);
			});
	}

	
	async startExperiment() {
		browserHistory.listen(jsPsych.endExperiment);


		// startExperiment (let worker prep database)
		try { await localAxios.post('/startExperiment'); }
		catch (e) { console.log('failed to startExperiment'); console.log(e); return; }

		// getStimuli, create the timeline, and start
		let stimuli;
		//let meta;
		try {
			// meta Qs not yet done via database (just hardcoded in jspTimeline)
			stimuli = (await localAxios.post('/getStimuli')).data.resData;
			console.log('got raw stimuli');
			console.log(stimuli);
		} catch (e) {
			console.log('failed to get timeline trial data');
			console.log(e);
			return;
		}

		try {
			stimuli = stimuli.map(stim => JSON.parse(stim.stimulus));
		} catch (e) {
			console.log('failed to parse stimuli');
			console.log(e);
			return;
		}

		this.setState({ loading: false });

		const timeline = buildTimeline(stimuli);

		jsPsych.init({
			display_element: this.refs.jsPsychTarget,
			timeline: timeline,
			on_finish: data => {
				this.endExperiment()
			}
		});
	}

	endExperiment() {
		this.setState({ showThanks: true });
		localAxios.post('/endExperiment');
	}

	render() {
		const thanks = (<h1>Thanks for participating</h1>);

		return (
			<div id="jsPsychContainer"> 
				{ this.state.loading && (<h1>Loading...</h1>)}
				<div ref="jsPsychTarget" style={{ display: this.state.loading ? 'none' : 'block' }}></div>
				{ this.state.showThanks && thanks }
			</div>
		);
	}
}
