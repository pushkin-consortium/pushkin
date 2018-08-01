import localAxios from './axiosConfigInitial';

const save = (type, mType) => data => {
	const path = type == 'meta' ? '/metaResponse' : '/stimulusResponse';

	const postData = type == 'meta' ?
		{ user_id: data.user_id,
			type: mType, // mType should match a column in the users table
			response: JSON.parse(data.responses).Q0 } :
		{ user_id: data.user_id,
			data_string: data };

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
const demographics = [
	{ type: 'survey-text',
		questions: [{ prompt: 'Date of birth:' }],
		button_label: 'Continue',
		on_finish: save('meta', 'dob') },
	{ type: 'survey-text',
		questions: [{ prompt: 'Native language:' }],
		button_label: 'Continue',
		on_finish: save('meta', 'native_language') }
];


const initialTimeline = [ intro, ...demographics ];

const buildTimeline = stimuli => [
	...initialTimeline,
	...stimuli.map(stimTrial => ({ ...stimTrial, on_finish: save('stimuli') }))
];

export { buildTimeline };
