// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('testquiz_stimulusResponses', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('testquiz_users');
    table.string('stimulus').references('stimulus').inTable('testquiz_stimuli');
    table.json('data_string');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('testquiz_stimulusResponses');
};
