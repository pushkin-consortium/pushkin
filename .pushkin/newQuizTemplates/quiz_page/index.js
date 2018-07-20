// Before compile time (prep time), this (and everything else in this folder) is moved to
// ${pushkin_front_end_quizzes_dir}, so all paths to modules located outside of this
// folder are relative to that root

import React from 'react';
import { browserHistory } from 'react-router';

import s from './styles.scss';
import jsPsychStyles from '../libraries/jsPsych/css/jspsych.css';
import jsPsychTimeline from './quiz_files/jsPsychTimeline';
// jsPsych isn't actually a "module" like normal modules are in node/commonJS
// it needs to be required globally and not assigned to a variable
require('../libraries/jsPsych/jspsych.js');
require('../libraries/jsPsych/plugins/jspsych-instructions.js');

export default class QUIZ_NAME extends React.Component {

	constructor(props) {
		super(props);
		this.state = { loading: true };
		browserHistory.listen(() => {
		  jsPsych.endExperiment();
		});
	};

	componentDidMount() {
		jsPsych.init({
			display_element: this.refs.jsPsychTarget,
			timeline: jsPsychTimeline
		});
	};


	render() {

		return (
			<div id="jsPsychContainer"> 
				<script type='text/javascript' src={jsPsych}></script>
				{/* <link>s only go in <head> ideally
					also, import them– that's how webpack reduces load time and requests and stuff
					<link
					rel="stylesheet"
					type="text/css"
					href={`${baseUrl}/css/jspsych.css`}
				/>*/}
				{/*
				<div ref="preamble" id="preamble">
					<div style={{ display: this.state.loading ? 'block' : 'none' }}>
						<p className={s.loading}>
							<b>Loading...</b>
						</p>
					</div>

					<div style={{ display: loading ? 'none' : '' }}>
						<p className={s.title}>${QUIZ_NAME}</p>
						<hr className={s.divider} />
					</div>
				</div>
				*/}

				<div ref="jsPsychTarget"></div>
			</div>
		);
	}
}
