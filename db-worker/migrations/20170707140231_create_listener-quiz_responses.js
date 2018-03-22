// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('listener-quiz_responses', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('listener-quiz_users');
    table.json('data_string');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('listener-quiz_responses');
};
