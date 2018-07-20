// At build time, this (and everything else in this folder) is moved to
// ${pushkin_front_end_quizzes_dir}, so all paths to modules located outside of this
// folder are relative to that root
const jsPsych = require("../../libraries/jsPsych/jspsych.js")

import React from 'react'
import s from './styles.scss'

import { browserHistory } from 'react-router';
import axios from '../../actions/axiosConfigInitial';
import baseUrl from '../../core/baseUrl';


export default class ${QUIZ_NAME} extends React.Component {

	constructor(props) {
		super(props);
		this.state = { loading: true };
		this.hideLoading = this.hideLoading.bind(this);
		browserHistory.listen(() => {
		  jsPsych.endExperiment();
		});
	};

	componentDidMount() {
    
		const _this = this;
	  
		var explain_study = {
			type: "instructions",
			pages:["<p align='left'> This vocabulary test was designed by researchers at Boston College. </p><p align='left'> When you finish, you will see how well you did compared to other people of a similar age and educational background. </p><p align='left'> We are studying how people's vocabularies are affected by things like age, birth order, and when you started learning English. </p><p align='left'> We also hope the quiz is fun and informative. Thank you for your participation! </p>"],
			show_clickable_nav: true,
			button_label_next:'Continue',
		};

		var consent = {
			type: 'instructions',
		   pages: ["<p align='left'> This experiment is being conducted by researchers at Boston College. Please read this consent statement carefully before deciding whether to participate.</p><p align='left'> <strong>About the research:</strong> This experiment examines people's knowledge of English vocabulary. We are interested in how this is affected by demographic variables like age, birth order, and the age at which you began learning English. </p><p align='left'><strong> Risks and Benefits:</strong> This research has no known risks. We will explain the purpose of the experiment at the end of the experiment, along with any potential implications of the research. To receive copies of journal articles or research summaries, email gameswithwords@gmail.com. </p><p align='left'> <strong>Confidentiality:</strong> Study participation is anonymous and confidential. We do not ask or store your identity. </p><p align='left'> <strong>Participation and Withdrawal:</strong> Your participation in this study is completely voluntary, and you may quit at any time without penalty.</p><p align='left'> <strong>Review:</strong> This study has been approved by the Massachusetts Institute of Technology institutional review board. </p><p align='left'><strong> Agreement: </strong>By pressing any key to continue, I indicate that this research have been sufficiently explained and I agree to participate in this study. </p>"],
			show_clickable_nav: true,
			button_label_next:'Continue'
		};
	  
	  
		  
		var intro = {
			type: 'instructions',
		   pages: [" <p align='left'> Are you interested in how your experience affects your language? So are we! </p><p align='left'> Please answer the following questions about yourself. </p><p align='left'> We will use the answers to show you your score compared to others like you and also for our research into language learning. </p><p align='left'> All answers are anonymous and confidential. </p>"],
			show_clickable_nav: true,
			button_label_next:'Continue'
		};
	  

		var timeline = [];

		timeline.push(explain_study)
		timeline.push(consent)
		timeline.push(intro)
		.then(() => {
						jsPsych.init({
							display_element: this.refs.jsPsychTarget,
							timeline: timeline
						});
					})
	};


	render() {
		const loading = this.state.loading;
		if (!this.props.children) {
		  return (
			<div>
			  <div id="jsPsychContainer"> 
				<link
				  rel="stylesheet"
				  type="text/css"
				  href={`${baseUrl}/css/jspsych.css`}
				/>
				<div ref="preamble" id="preamble">
				  <div style={{ display: loading ? '' : 'none' }}>
					<p className={s.loading}>
					  <b>Loading...</b>
					</p>
				  </div>
	
				  <div style={{ display: loading ? 'none' : '' }}>
					<p className={s.title}>${QUIZ_NAME}</p>
					<hr className={s.divider} />
				  </div>
				</div>
	
				<div ref="jsPsychTarget" id="jsPsychTarget" />
			  </div>
			</div>
		  );
		}
		return this.props.children;
	  }
	}
