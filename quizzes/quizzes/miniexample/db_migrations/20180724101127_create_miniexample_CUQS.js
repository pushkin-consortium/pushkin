// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('miniexample_CUQS', table => {
    table.increments('id').primary();
    table.integer('group').references('stimuli_group').inTable('miniexample_CUQ');
    table.integer('stimulus').references('id').inTable('miniexample_stimuli');
    table.integer('position');
    table.json('response_json');
    table.timestamp('answered_at');
    table.timestamp('modified_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_CUQS');
};
