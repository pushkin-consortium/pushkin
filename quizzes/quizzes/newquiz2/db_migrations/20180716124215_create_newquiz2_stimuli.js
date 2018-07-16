exports.up = function(knex) {
  return knex.schema.createTable('newquiz2_stimuli', table => {
    table.increments('id').primary();
  	table.string('task');
    table.string('stimulus').unique();
    table.string('options');
    table.integer('num_responses');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('newquiz2_stimuli');
};
