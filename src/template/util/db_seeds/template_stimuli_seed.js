
exports.seed = function(knex, Promise) {
	// Deletes ALL existing entries
	return knex('template_stimuli').del()
		.then(function () {
			// Inserts seed entries

			const colors = [ 'red', 'yellow', 'blue', 'robin egg blue', 'white', 'swamp green', 'fern green', 'grass green' ];

			const tests = [
				{ p: 'What color is the sky?', a: 'blue' },
				{ p: 'What color is grass?', a: 'grass green' },
				{ p: 'What color is blue?', a: 'blue' }
			];
			const trickyQuestions = [
				{ p: 'What color are ovals?', a: 'white' },
				{ p: 'What color is air?', a: 'blue' },
				{ p: 'Are you sure?', a: 'red' },
				{ p: 'What color are robins?', a: 'robin egg blue' },
				{ p: 'Hmm... guess again.', a: 'robin egg blue' },
			];

			// Set removes duplicates, which the db won't ensure (in case we switch stimulus to JSON type)
			const insertData = [ ...new Set(
				[ ...tests, ...trickyQuestions ]
			)].map(q => ({
				stimulus: {
					type: 'html-button-response',
					stimulus: q.p,
					choices: colors
				},
				correct: q.a
			}));

			return knex('template_stimuli').insert(insertData);
		});
};
