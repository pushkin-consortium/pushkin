// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('${QUIZ_NAME}_stimulusGroups', table => {
    table.increments('id').primary();
		table.timestamp('created_at');
		table.timestamp('modified_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${QUIZ_NAME}_stimulusGroups');
};
