import localAxios from './axiosConfigInitial';

const intro = {
	type: 'instructions',
	pages: ["<p>Hi! Welcome to our experiment. When you're ready to start, press continue.</p>"],
	show_clickable_nav: true,
	button_label_next:'Continue',
	saveData: false
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

const initialTimeline = [ intro ];

const buildTimeline = (meta, stimuli) => {

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

	const timeline =
		initialTimeline.concat(
			meta.map(metaTrial => ({ ...metaTrial, on_finish: save('meta') }))
		).concat(
			stimuli.map(stimTrial => ({ ...stimTrial, on_finish: save('stimuli') }));
		);

	return timeline;
}


export { buildTimeline };
