import localAxios from './axiosConfigInitial';

const save = type => data => {
	const path = type == 'meta' ? '/metaResponse' : '/stimulusResponse';
	const postData = {
		user_id: data.user_id,
		data_string: data
	};
	try {
		localAxios.post(path, postData);
	} catch (e) {
		console.log('Error posting to response API:');
		console.log(e);
	}
};

// initial timeline (eventaully meta questions should be received dynamically and passed in
// the same way stimuli are)
const intro = {
	type: 'instructions',
	pages: ["<p>Hi! Welcome to our experiment. When you're ready to start, press continue.</p>"],
	show_clickable_nav: true,
	button_label_next:'Continue'
};
const demographics = {
	type: 'survey-text',
	questions: [{ prompt: 'Date of birth:' }, { prompt: 'Native language:' }],
	preamble: 'Please fill out some basic information before starting',
	button_label: 'Continue',
	on_finish: save('meta')
};
/*
const question1 = {
	type: 'html-button-response',
	stimulus: 'What\'s the better color to wear in the morning?',
	choices: ['orange', 'yellow', 'blue', 'red', 'black', 'white'],
	saveData: true
};
const question2 = {
	type: 'html-button-response',
	stimulus: 'What\'s the better color to wear in the evening?',
	choices: ['orange', 'yellow', 'blue', 'red', 'black', 'white'],
	saveData: true
};
*/

const initialTimeline = [ intro, demographics ];

const buildTimeline = (meta, stimuli) => 
	initialTimeline.concat(
		meta.map(metaTrial => ({ ...metaTrial, on_finish: save('meta') }))
	).concat(
		stimuli.map(stimTrial => ({ ...stimTrial, on_finish: save('stimuli') }))
	);

export { buildTimeline };
