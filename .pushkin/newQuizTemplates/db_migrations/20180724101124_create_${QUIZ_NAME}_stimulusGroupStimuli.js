// const knex = require('knex')(require('./knex.config.js'));

exports.up = function(knex) {
  return knex.schema.createTable('${QUIZ_NAME}_stimulusGroupStimuli', table => {
    table.increments('id').primary();
		table.integer('group').references('id').inTable('${QUIZ_NAME}_stimulusGroups').notNullable();
    table.integer('stimulus').references('id').inTable('${QUIZ_NAME}_stimuli').notNullable();
		table.integer('position').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${QUIZ_NAME}_stimulusGroupStimuli');
};
