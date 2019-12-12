// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('pushkintemplate_TUQSR', table => {
    table.increments('id').primary();
	table.string('user_id').references('user_id').inTable('pushkintemplate_TUQ').notNullable();
    table.integer('stimulus').references('id').inTable('pushkintemplate_stimuli').notNullable();
    table.json('response').notNullable();
    table.timestamp('answered_at').notNullable();
    table.timestamp('modified_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkintemplate_TUQSR');
};
