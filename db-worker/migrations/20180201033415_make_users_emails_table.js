
exports.up = function(knex, Promise) {
  return knex.schema.createTable('users_emails', function(table) {
    table.string('auth0_id').primary();
    table.string('email');
    table.timestamp('created_at');
    table.timestamp('updated_at');
  })
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users_emails');
};
