
require('script-loader!../../custom_plugins/jspsych-survey-multi-choice-2.js');

import React, { PropTypes } from 'react';
import ReactResizeDetector from 'react-resize-detector';
import { browserHistory } from 'react-router';
import * as axiosBloodmagic from './axiosBloodmagic';
import baseUrl from '../../../core/baseUrl';
import s from './bloodmagic.css';

import VerbcornerLeaderboard from '../../../components/LeaderBoardComponents/VerbcornerLeaderboard/index.js';

class Bloodmagic extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			loading: true,
			isVideoModalOpen: false
		};
		this.hideLoading = this.hideLoading.bind(this);
		this.onResize = this.onResize.bind(this);
		window.addEventListener('resize', this.onResize.bind(this));
		browserHistory.listen(() => {
			jsPsych.endExperiment();
			if (this.refs.jsPsychTarget) {
				const node = this.refs.jsPsychTarget;
				// might need to manu
			}
			// window.location.reload();
		});
	}
	hideLoading(props) {
		this.setState({ loading: false });
	}

	onResize() {
		const margin =
			(document.documentElement.clientHeight -
				document.getElementById('header').scrollHeight -
				document.getElementById('footer').scrollHeight -
				15 -
				document.getElementById('jsPsychTarget').scrollHeight) /
			2;
		if (margin > 0) {
			document.getElementById('jsPsychTarget').style.marginTop = `${margin}px`;
		} else {
			document.getElementById('jsPsychTarget').style.marginTop = '0px';
		}
	}

	componentDidMount() {
		// quiz specific user_id is available at this.props.userInfo.subjectIds

		var self = this;

		var story = {
			longstory: `<p><strong>Instructions: </strong><br><br>In a dark dimension there is a planet ruled by a vicious, selfish, Blood Wizard, who demands tribute. The Blood Wizard demands that whenever goods change possession, a tribute be paid: a blood sacrifice. The Blood Wizard is the first, the overseer, the ancient evil in the dark. He will know if the tribute is not paid. The blood of everyone involved in the transaction will turn to stone should they refuse or forget to make the sacrifice.</p>

		<p>You, as mayor of the town, have a magic scroll that records everything that happens in the town. Your job is to read through the scroll and identify anyone who must make a blood sacrifice at the weekly ritual tomorrow.</p>

		<p>For example, if Gwydion gives Morgana a cloak, you mark down that a sacrifice is owed. It does not matter whether the transfer is temporary (as in a loan) or permanent (as in a sale). It does not matter if the good itself has moved (as in selling a house). Whenever possession changes, the blood sacrifice is owed.</p>

		<p>Your anemic villagers are barely surviving in their blood-starved state. Do not exact a tribute just because someone might have transferred something (“Sally celebrated Mary’s birthday”). If there was a transfer, the scroll would have said so directly (“Sally gave Mary a present”).</p>

		<p>The Blood Wizard worries that you will try to protect your friends. For this reason, the scroll’s information is anonymous. People\'s names have been changed randomly (so "Mary" in one report may not be the "Mary" in another), and many of the other words have similarly been randomly replaced with vague words ("St. Louis" might become "the place", and "the sandwich" might become "the object".</p>

		<p><strong>Summary:</strong></br><br>
		1) Read the scroll.</br>
		2) Decide whether any good has changed possession. If so, a blood sacrifice must be made.</br>
		3) Note which person was the original possessor and owes the blood sacrifice.</p>`,

			shortstory: `
		1) Read the scroll.</br>
		2) Decide whether any good has changed possession. If so, a blood sacrifice must be made.</br>
		3) Note which person was the original possessor and owes the blood sacrifice.</p>`
		};
		var introduction = {
			type: 'instructions',
			pages: [story.longstory],
			show_clickable_nav: true
		};
		var timeline = [];
		timeline.push(introduction);
		const attention_check = {
			type: 'survey-multi-choice2',
			required: true,
			questions: ['What color is the Sky?'],
			options: [['Blue', 'Green']],
			correct: ['NA'],
			on_finish: customOnFinish,
			horizontal: false
		};
		timeline.push(attention_check);
		let index = 0;
		var customOnFinish = function(data) {
			index++;
			jsPsych.pauseExperiment();
			// have to filter out the attention_check
			if (data.questions && data.trial_index >= 1) {
				let stimulus = data.questions[0];
				return axiosBloodmagic
					.post('/stimulusResponse', {
						user_id: self.props.user.profile.id,
						stimulus: stimulus,
						data_string: data
					})
					.then(function(res) {
						//this is for saving temperary answers from a anonymous user incase the user choose to login in the middle of the quiz
						self.props.dispatchTempResponse({
							user_id: self.props.user.profile.id,
							data_string: data
						});
						// fetch the next question
						return axiosBloodmagic
							.get('/questionsAnswered', {
								params: {
									user_id: self.props.user.profile.id
								}
							})
							.then(({ data: { count } }) => {
								const num = parseInt(count, 10);
								return self.setState({ count: num });
							})
							.then(() => {
								return axiosBloodmagic.get('/random', {
									params: {
										user_id: self.props.user.profile.id
									}
								});
							});
					})
					.then(stimulus => {
						if (!stimulus.data) {
							// they have answered all the quiz questions
							// there are none left they havent tackled
							const instructionTrial = {
								type: 'instructions',
								pages: [
									`<h3>All trials are complete, thanks for your participation</h3>`
								]
							};
							jsPsych.addNodeToEndOfTimeline(instructionTrial, function() {
								jsPsych.resumeExperiment();
							});
						} else {
							const samplestim = stimulus.data;
							const trial = {
								type: 'survey-multi-choice2',
								required: true,
								questions: [samplestim.stimulus],
								options: [samplestim.options.split(',')],
								correct: ['NA'],
								on_finish: customOnFinish,
								preamble: story.shortstory,
								horizontal: false
							};
							trial.options[0].push('Third option');
							jsPsych.addNodeToEndOfTimeline(trial, function() {
								jsPsych.resumeExperiment();
								window.setTimeout(function() {
									var current_trial = jsPsych.currentTrial();
									var node = document.getElementById('jspsych-btn');
									if (node) {
										node.style.backgroundColor = 'tomato';
									}
									current_trial.trial_index = index;
									self.props.mountCurrentQuestion(current_trial);
								}, 1);
							});
						}
					});
			}
			return axiosBloodmagic
				.get('/questionsAnswered', {
					params: {
						user_id: self.props.user.profile.id
					}
				})
				.then(({ data: { count } }) => {
					debugger;
					this.setState({ count: parseInt(count) });
					return axiosBloodmagic.get('/random', {
						params: {
							user_id: self.props.user.profile.id
						}
					});
				})
				.then(stimulus => {
					const samplestim = stimulus.data;
					const trial = {
						type: 'survey-multi-choice2',
						required: true,
						questions: [samplestim.stimulus],
						options: [samplestim.options.split(',')],
						correct: ['NA'],
						horizontal: false,
						on_finish: customOnFinish
					};
					trial.options[0].push('Third option');
					jsPsych.addNodeToEndOfTimeline(trial, function() {
						jsPsych.resumeExperiment();
						window.setTimeout(function() {
							var current_trial = jsPsych.currentTrial();
							var node = document.getElementById('jspsych-btn');
							if (node) {
								node.style.backgroundColor = 'tomato';
							}
							current_trial.trial_index = index;
							self.props.mountCurrentQuestion(current_trial);
						}, 1);
					});
				});
		}; // end of customOnFinish
		const loop_node = {
			timeline: [
				{
					...timeline[0]
				},
				{
					...timeline[1],
					on_finish: customOnFinish
				}
			]
		};

		jsPsych.init({
			display_element: this.refs.jsPsychTarget,
			timeline: [loop_node],
			on_data_update: function(data) {
				const content = document.getElementById('jspsych-content');
				if (content) {
					content.focus();
				}
			}
		});
	}
	render() {
		return (
			<div>
			<VerbcornerLeaderboard
			quiz={['bloodmagic']}
			count={this.state.count}
			showVideo
			showInstructions
			videoSource={'../../../../quizzes/bloodmagic/video/bloodmagic_instructions.mp4'}
			/>
			<div className={s.bloodMagicWrapper}>
			<div ref='jsPsychTarget' id='jsPsychTarget' />
			</div>
			</div>
		);
	}
}
Bloodmagic.propTypes = {
	user: React.PropTypes.object.isRequired
};
export default Bloodmagic;
