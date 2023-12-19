// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('pushkin_userResults', table => {
    table.increments('id').primary();
    table.string('user_id').references('user_id').inTable('pushkin_users').notNullable();
  	table.string('experiment').notNullable();
    table.json('results').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkin_userResults');
};
