import localAxios from './axiosConfigInitial';

const intro = {
	type: 'instructions',
	pages: ["<p>Hi! Welcome to our experiment. When you're ready to start, press continue.</p>"],
	show_clickable_nav: true,
	button_label_next:'Continue',
	saveData: false
};
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

const rawTimeline = [
	intro, question1, question2
];

const getTimeline = () => {

	const save = data => {
		const postData = {
			user_id: data.user_id,
			data_string: data
		};
		try {
			localAxios.post('/response', postData);
		} catch (e) {
			console.log('Error posting to response API:');
			console.log(e);
		}
	};

	const timeline = rawTimeline.map(trial => ({
		...trial,
		on_finish: trial.saveData ? save : null,
	}));

	return timeline;
}


export { getTimeline };
