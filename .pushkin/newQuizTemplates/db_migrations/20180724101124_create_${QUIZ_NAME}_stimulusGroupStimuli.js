// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('miniexample_stimulusGroupStimuli', table => {
    table.increments('id').primary();
		table.integer('group').references('id').inTable('miniexample_stimulusGroups').notNullable();
    table.integer('stimulus').references('id').inTable('miniexample_stimuli').notNullable();
		table.integer('position').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('miniexample_stimulusGroupStimuli');
};
