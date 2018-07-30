// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('miniexample_metaQuestions', table => {
    table.increments('id').primary();
    table.json('question_json');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_metaQuestions');
};
