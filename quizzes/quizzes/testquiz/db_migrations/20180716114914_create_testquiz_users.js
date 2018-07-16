exports.up = function(knex) {
  return knex.schema.createTable('testquiz_users', table => {
    table.increments('id').primary();
    table.string('auth0_id');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('testquiz_users');
};
