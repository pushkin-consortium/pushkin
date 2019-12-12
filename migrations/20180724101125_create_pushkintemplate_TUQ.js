// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('pushkintemplate_TUQ', table => {
    table.string('user_id').primary()//.references('id').inTable('pushkintemplate_users').primary();
    table.integer('stim_group').references('id').inTable('pushkintemplate_stimulusGroups').notNullable();
    table.timestamp('started_at').notNullable();
    table.timestamp('finished_at');
		table.integer('cur_position').unsigned().notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('pushkintemplate_TUQ');
};
