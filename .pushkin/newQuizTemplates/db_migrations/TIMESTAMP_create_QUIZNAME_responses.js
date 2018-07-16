exports.up = function(knex) {
  return knex.schema.createTable('${QUIZ_NAME}_responses', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('${QUIZ_NAME}_users');
    table.json('data_string');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('${QUIZ_NAME}_responses');
};
