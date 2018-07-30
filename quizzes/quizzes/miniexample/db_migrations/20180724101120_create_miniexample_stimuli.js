exports.up = function(knex) {
  return knex.schema.createTable('miniexample_stimuli', table => {
    table.increments('id').primary();
    table.json('stimulus').unique();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_stimuli');
};
