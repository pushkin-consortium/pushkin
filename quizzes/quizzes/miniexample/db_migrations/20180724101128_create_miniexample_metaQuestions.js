// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('miniexample_CUQS', table => {
    table.increments('id').primary();
    table.json('question_json');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_CUQS');
};
