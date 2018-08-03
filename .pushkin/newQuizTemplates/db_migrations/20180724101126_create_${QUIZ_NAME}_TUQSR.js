// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('${QUIZ_NAME}_TUQSR', table => {
    table.increments('id').primary();
		table.integer('user_id').references('user_id').inTable('${QUIZ_NAME}_TUQ').notNullable();
    table.integer('stimulus').references('id').inTable('${QUIZ_NAME}_stimuli').notNullable();
    table.json('response').notNullable();
    table.timestamp('answered_at').notNullable();
    table.timestamp('modified_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${QUIZ_NAME}_TUQSR');
};
