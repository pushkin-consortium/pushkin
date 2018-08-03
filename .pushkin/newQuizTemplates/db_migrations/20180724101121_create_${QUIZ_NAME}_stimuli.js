exports.up = function(knex) {
  return knex.schema.createTable('${QUIZ_NAME}_stimuli', table => {
    table.increments('id').primary();
		table.string('stimulus').unique().notNullable();
		table.string('correct');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${QUIZ_NAME}_stimuli');
};
