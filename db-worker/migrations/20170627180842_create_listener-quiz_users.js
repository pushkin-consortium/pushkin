exports.up = function(knex) {
  return knex.schema.createTable('listener-quiz_users', table => {
    table.increments('id').primary();
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('listener-quiz_users');
};
