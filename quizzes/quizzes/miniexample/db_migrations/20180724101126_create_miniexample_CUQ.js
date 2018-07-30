// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('miniexample_CUQ', table => {
    table.integer('user_id').references('id').inTable('miniexample_users').primary();
    table.integer('stimuli_group').unique();
		table.integer('cur_position');
    table.timestamp('started_at');
    table.timestamp('finished_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_CUQ');
};
