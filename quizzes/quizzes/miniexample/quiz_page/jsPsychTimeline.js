const intro = {
	type: 'instructions',
	pages: [" <p>Hi! Welcome to our experiment. When you're ready to start, press continue.</p>"],
	show_clickable_nav: true,
	button_label_next:'Continue'
};
const question1 = {
	type: 'html-button-response',
	stimulus: 'What\'s the better color to wear in the morning?',
	choices: ['orange', 'yellow', 'blue', 'red', 'black', 'white'],
}
const question2 = {
	type: 'html-button-response',
	stimulus: 'What\'s the better color to wear in the evening?',
	choices: ['orange', 'yellow', 'blue', 'red', 'black', 'white'],
}

	
const timeline = [intro, question1, question2];

export default timeline;
