// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('sessiontest_stimulusGroupStimuli', table => {
    table.increments('id').primary();
		table.integer('group').references('id').inTable('sessiontest_stimulusGroups').notNullable();
    table.integer('stimulus').references('id').inTable('sessiontest_stimuli').notNullable();
		table.integer('position').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('sessiontest_stimulusGroupStimuli');
};
