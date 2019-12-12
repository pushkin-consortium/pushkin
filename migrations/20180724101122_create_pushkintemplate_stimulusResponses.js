// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('pushkintemplate_stimulusResponses', table => {
    table.increments('id').primary();
    table.string('user_id').references('id')//.inTable('pushkintemplate_users').notNullable();
    table.integer('stimulus').references('id').inTable('pushkintemplate_stimuli').notNullable();
    table.json('response').notNullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkintemplate_stimulusResponses');
};
