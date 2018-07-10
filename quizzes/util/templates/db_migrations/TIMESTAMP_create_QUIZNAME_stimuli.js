exports.up = function(knex) {
  return knex.schema.createTable('${QUIZ_NAME}_stimuli', table => {
    table.increments('id').primary();
  	table.string('task');
    table.string('stimulus').unique();
    table.string('options');
    table.integer('num_responses');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${QUIZ_NAME}_stimuli');
};
