// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('test_TUQSR', table => {
    table.increments('id').primary();
		table.integer('user_id').references('user_id').inTable('test_TUQ').notNullable();
    table.integer('stimulus').references('id').inTable('test_stimuli').notNullable();
    table.json('response').notNullable();
    table.timestamp('answered_at').notNullable();
    table.timestamp('modified_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('test_TUQSR');
};
