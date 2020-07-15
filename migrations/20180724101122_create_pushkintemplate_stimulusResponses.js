// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('pushkintemplate_stimulusResponses', table => {
    table.increments('id').primary();
    table.string('user_id').references('user_id').inTable('pushkin_users').notNullable();
    table.string('stimulus').notNullable();
    table.json('response').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkintemplate_stimulusResponses');
};
