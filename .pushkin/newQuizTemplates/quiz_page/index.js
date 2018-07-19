// At build time, this (and everything else in this folder) is moved to
// ${pushkin_front_end_quizzes_dir}, so all paths to modules located outside of this
// folder are relative to that root
const jsPsych = require("../libraries/jsPsych/jspsych.js")

import React from 'react'
import s from './styles.scss'

export default class ${QUIZ_NAME} extends React.Component {

	render() {
		return (
			<p>Welcome to the ${QUIZ_NAME} quiz!</p>
		);
	}
}
