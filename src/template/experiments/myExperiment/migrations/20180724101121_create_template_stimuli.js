exports.up = function(knex) {
  return knex.schema.createTable('template_stimuli', table => {
    table.increments('id').primary();
		table.string('stimulus').unique().notNullable();
		table.string('correct');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('template_stimuli');
};
